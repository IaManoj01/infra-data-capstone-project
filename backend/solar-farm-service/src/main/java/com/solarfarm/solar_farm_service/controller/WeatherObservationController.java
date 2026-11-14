package com.solarfarm.solar_farm_service.controller;

import com.solarfarm.solar_farm_service.entity.WeatherObservation;
import com.solarfarm.solar_farm_service.service.WeatherObservationService;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/weather")
@CrossOrigin(origins = "*") // Allows your React frontend to call these endpoints
public class WeatherObservationController {

  private final WeatherObservationService weatherService;

  public WeatherObservationController(WeatherObservationService weatherService) {
    this.weatherService = weatherService;
  }

  @GetMapping
  public List<WeatherObservation> getAllWeather() {
    return weatherService.getAllObservations();
  }

  @GetMapping("/sites")
  public List<String> getWeatherSites() {
    return weatherService.getWeatherSites();
  }

  @GetMapping("/site/{siteId}")
  public List<WeatherObservation> getWeatherBySite(@PathVariable String siteId) {
    return weatherService.getObservationsBySite(siteId);
  }

  @GetMapping("/site/{siteId}/timeframe")
  public List<WeatherObservation> getWeatherBySiteAndTimeframe(
      @PathVariable String siteId,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
    return weatherService.getObservationsForSiteAndTimeframe(siteId, start, end);
  }

  @GetMapping("/timeframe")
  public List<WeatherObservation> getWeatherByTimeframe(
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
    return weatherService.getObservationsForTimeframe(start, end);
  }
}
