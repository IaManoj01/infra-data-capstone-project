package com.solarfarm.solar_farm_service.service;

import com.solarfarm.solar_farm_service.entity.WeatherObservation;
import com.solarfarm.solar_farm_service.repository.WeatherObservationRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WeatherObservationService {

  private final WeatherObservationRepository weatherRepository;

  public List<WeatherObservation> getAllObservations() {
    return weatherRepository.findAll();
  }

  public List<String> getWeatherSites() {
    return weatherRepository.findDistinctSiteIds();
  }

  public List<WeatherObservation> getObservationsBySite(String siteId) {
    return weatherRepository.findBySiteId(siteId);
  }

  public List<WeatherObservation> getObservationsForTimeframe(
      LocalDateTime start, LocalDateTime end) {
    return weatherRepository.findByTimestampBetween(start, end);
  }

  public List<WeatherObservation> getObservationsForSiteAndTimeframe(
      String siteId, LocalDateTime start, LocalDateTime end) {
    return weatherRepository.findBySiteIdAndTimestampBetween(siteId, start, end);
  }
}
