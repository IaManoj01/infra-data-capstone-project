package com.solarfarm.solar_farm_service.service;

import com.solarfarm.solar_farm_service.entity.InverterGeneration;
import com.solarfarm.solar_farm_service.repository.InverterGenerationRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class InverterGenerationService {

  private final InverterGenerationRepository generationRepository;

  public List<InverterGeneration> getAllGenerationData() {
    return generationRepository.findAll();
  }

  public List<String> getSites() {
    return generationRepository.findDistinctSiteIds();
  }

  public List<InverterGeneration> getGenerationBySite(String siteId) {
    return generationRepository.findBySiteId(siteId);
  }

  public List<InverterGeneration> getGenerationBySiteAndInverter(String siteId, String inverterId) {
    return generationRepository.findBySiteIdAndInverterId(siteId, inverterId);
  }

  public List<InverterGeneration> getGenerationByInverterId(String inverterId) {
    return generationRepository.findByInverterId(inverterId);
  }

  public List<InverterGeneration> getGenerationForTimeframe(
      String inverterId, LocalDateTime start, LocalDateTime end) {
    return generationRepository.findByInverterIdAndTimestampBetween(inverterId, start, end);
  }

  public List<InverterGeneration> getGenerationForSiteAndTimeframe(
      String siteId, LocalDateTime start, LocalDateTime end) {
    return generationRepository.findBySiteIdAndTimestampBetween(siteId, start, end);
  }

  public List<InverterGeneration> getAnomalies() {
    List<InverterGeneration> faults = generationRepository.findByStatusFlag("FAULT");
    List<InverterGeneration> trips = generationRepository.findByStatusFlag("TRIP");
    List<InverterGeneration> dropouts = generationRepository.findByStatusFlag("DROPOUT");

    List<InverterGeneration> allAnomalies = new ArrayList<>();
    allAnomalies.addAll(faults);
    allAnomalies.addAll(trips);
    allAnomalies.addAll(dropouts);

    return allAnomalies;
  }
}
