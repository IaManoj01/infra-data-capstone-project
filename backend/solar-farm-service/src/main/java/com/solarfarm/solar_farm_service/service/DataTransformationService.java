package com.solarfarm.solar_farm_service.service;

import com.solarfarm.solar_farm_service.dto.EtlBatchResponse;
import com.solarfarm.solar_farm_service.entity.FaultTicket;
import com.solarfarm.solar_farm_service.entity.InverterGeneration;
import com.solarfarm.solar_farm_service.entity.TicketStatus;
import com.solarfarm.solar_farm_service.entity.WeatherObservation;
import com.solarfarm.solar_farm_service.entity.raw.RawInverterGeneration;
import com.solarfarm.solar_farm_service.entity.raw.RawWeatherObservation;
import com.solarfarm.solar_farm_service.repository.FaultTicketRepository;
import com.solarfarm.solar_farm_service.repository.InverterGenerationRepository;
import com.solarfarm.solar_farm_service.repository.RawInverterGenerationRepository;
import com.solarfarm.solar_farm_service.repository.RawWeatherObservationRepository;
import com.solarfarm.solar_farm_service.repository.WeatherObservationRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DataTransformationService {

  private final RawWeatherObservationRepository rawWeatherRepo;
  private final RawInverterGenerationRepository rawGenRepo;

  private final WeatherObservationRepository weatherRepo;
  private final InverterGenerationRepository generationRepo;

  private final FaultTicketRepository faultTicketRepo;

  public DataTransformationService(
      RawWeatherObservationRepository rawWeatherRepo,
      RawInverterGenerationRepository rawGenRepo,
      WeatherObservationRepository weatherRepo,
      InverterGenerationRepository generationRepo,
      FaultTicketRepository faultTicketRepo) {
    this.rawWeatherRepo = rawWeatherRepo;
    this.rawGenRepo = rawGenRepo;
    this.weatherRepo = weatherRepo;
    this.generationRepo = generationRepo;
    this.faultTicketRepo = faultTicketRepo;
  }

  @Transactional
  public EtlBatchResponse cleanAndTransformData() {

    System.out.println("========== ETL STARTED ==========");

    // 1. Fetch records that have not yet been inserted
    //    into their corresponding clean tables.

    List<RawWeatherObservation> rawWeather = rawWeatherRepo.findPendingWeatherRecords();

    List<RawInverterGeneration> rawGeneration = rawGenRepo.findPendingGenerationRecords();

    System.out.println("Pending weather records: " + rawWeather.size());
    System.out.println("Pending generation records: " + rawGeneration.size());

    int weatherInserted = 0;
    int generationInserted = 0;
    int ticketsCreated = 0;

    // 2. Transform weather records first.

    for (RawWeatherObservation raw : rawWeather) {

      boolean alreadyExists =
          weatherRepo.existsByTimestampAndSiteId(raw.getTimestamp(), raw.getSiteId());

      if (alreadyExists) {
        continue;
      }

      WeatherObservation clean = new WeatherObservation();

      clean.setTimestamp(raw.getTimestamp());
      clean.setSiteId(raw.getSiteId());

      clean.setIrradianceWM2(raw.getIrradianceWM2());
      clean.setAmbientTempC(raw.getAmbientTempC());
      clean.setModuleTempC(raw.getModuleTempC());
      clean.setCloudCoverPct(raw.getCloudCoverPct());

      weatherRepo.save(clean);

      weatherInserted++;
    }

    weatherRepo.flush();

    // 3. Transform inverter generation records.

    for (RawInverterGeneration raw : rawGeneration) {

      boolean alreadyExists =
          generationRepo.existsByTimestampAndSiteIdAndInverterId(
              raw.getTimestamp(), raw.getSiteId(), raw.getInverterId());

      if (alreadyExists) {
        continue;
      }

      // Find the corresponding clean weather record.

      WeatherObservation weather =
          weatherRepo.findBySiteIdAndTimestamp(raw.getSiteId(), raw.getTimestamp()).orElse(null);

      InverterGeneration clean = new InverterGeneration();

      clean.setTimestamp(raw.getTimestamp());
      clean.setSiteId(raw.getSiteId());
      clean.setInverterId(raw.getInverterId());

      clean.setDcPowerKw(raw.getDcPowerKw());
      clean.setAcPowerKw(raw.getAcPowerKw());
      clean.setIntervalEnergyKwh(raw.getEnergyKwh());
      clean.setGridVoltageV(raw.getGridVoltageV());
      clean.setPowerFactor(raw.getPowerFactor());

      String statusFlag = "NORMAL";

      // 4. Fault detection.

      if (weather == null) {

        statusFlag = "WEATHER_UNAVAILABLE";

      } else {

        Double irradiance = weather.getIrradianceWM2();

        boolean sufficientIrradiance = irradiance != null && irradiance > 200;

        boolean zeroDcPower = raw.getDcPowerKw() != null && raw.getDcPowerKw() == 0.0;

        boolean zeroAcPower = raw.getAcPowerKw() != null && raw.getAcPowerKw() == 0.0;

        // Inverter communication failure.

        if (zeroDcPower && zeroAcPower && raw.getGridVoltageV() == null && sufficientIrradiance) {

          statusFlag = "FAULT";

          if (createFaultTicket(raw, "COMMS_OFFLINE", "Inverter communication appears offline.")) {
            ticketsCreated++;
          }

        }

        // Inverter trip.

        else if (zeroDcPower
            && zeroAcPower
            && raw.getGridVoltageV() != null
            && sufficientIrradiance) {

          statusFlag = "FAULT";

          if (createFaultTicket(
              raw,
              "INVERTER_TRIP",
              "Inverter is producing zero power despite sufficient irradiance.")) {
            ticketsCreated++;
          }

        }

        // Grid voltage spike.

        else if (raw.getGridVoltageV() != null && raw.getGridVoltageV() > 450) {

          statusFlag = "FAULT";

          if (createFaultTicket(
              raw, "VOLTAGE_SPIKE", "Grid voltage exceeded the configured threshold.")) {
            ticketsCreated++;
          }
        }

        // Thermal warning is evaluated independently.

        if (weather.getModuleTempC() != null && weather.getModuleTempC() > 65) {

          statusFlag = "FAULT";

          if (createFaultTicket(
              raw, "THERMAL_WARNING", "Module temperature exceeded 65 degrees Celsius.")) {
            ticketsCreated++;
          }
        }
      }

      clean.setStatusFlag(statusFlag);

      generationRepo.save(clean);

      generationInserted++;
    }

    // 5. Log ETL execution summary.

    System.out.println("========== ETL SUMMARY ==========");

    System.out.println("Weather records read: " + rawWeather.size());
    System.out.println("Weather records inserted: " + weatherInserted);

    System.out.println("Generation records read: " + rawGeneration.size());
    System.out.println("Generation records inserted: " + generationInserted);

    System.out.println("Fault tickets created: " + ticketsCreated);

    System.out.println("=================================");

    // 6. Return execution summary.

    String message;

    if (rawWeather.isEmpty() && rawGeneration.isEmpty()) {
      message = "No pending records found.";
    } else {
      message = "ETL processing completed successfully.";
    }

    System.out.println("========== ETL COMPLETED ==========");

    return new EtlBatchResponse(
        "SUCCESS",
        rawWeather.size(),
        weatherInserted,
        rawGeneration.size(),
        generationInserted,
        ticketsCreated,
        message);
  }

  // 7. Fault ticket creation.

  private boolean createFaultTicket(RawInverterGeneration raw, String faultType, String notes) {

    boolean alreadyExists =
        faultTicketRepo.existsBySiteIdAndInverterIdAndFaultTypeAndStatusIn(
            raw.getSiteId(),
            raw.getInverterId(),
            faultType,
            List.of(TicketStatus.OPEN, TicketStatus.IN_PROGRESS));

    if (alreadyExists) {
      return false;
    }

    FaultTicket ticket = new FaultTicket();

    ticket.setTimestamp(raw.getTimestamp());
    ticket.setSiteId(raw.getSiteId());
    ticket.setInverterId(raw.getInverterId());
    ticket.setFaultType(faultType);
    ticket.setStatus(TicketStatus.OPEN);
    ticket.setNotes(notes);

    faultTicketRepo.save(ticket);

    return true;
  }
}
