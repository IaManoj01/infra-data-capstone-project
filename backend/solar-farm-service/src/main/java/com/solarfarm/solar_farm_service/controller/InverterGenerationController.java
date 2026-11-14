package com.solarfarm.solar_farm_service.controller;

import com.solarfarm.solar_farm_service.entity.InverterGeneration;
import com.solarfarm.solar_farm_service.service.InverterGenerationService;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/generation")
@CrossOrigin(origins = "*")
public class InverterGenerationController {

  private final InverterGenerationService generationService;

  public InverterGenerationController(InverterGenerationService generationService) {
    this.generationService = generationService;
  }

  @GetMapping
  public List<InverterGeneration> getAllGeneration() {
    return generationService.getAllGenerationData();
  }

  @GetMapping("/sites")
  public List<String> getSites() {
    return generationService.getSites();
  }

  @GetMapping("/site/{siteId}")
  public List<InverterGeneration> getGenerationBySite(@PathVariable String siteId) {
    return generationService.getGenerationBySite(siteId);
  }

  @GetMapping("/site/{siteId}/inverter/{inverterId}")
  public List<InverterGeneration> getGenerationBySiteAndInverter(
      @PathVariable String siteId, @PathVariable String inverterId) {
    return generationService.getGenerationBySiteAndInverter(siteId, inverterId);
  }

  @GetMapping("/site/{siteId}/timeframe")
  public List<InverterGeneration> getGenerationBySiteAndTimeframe(
      @PathVariable String siteId,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
    return generationService.getGenerationForSiteAndTimeframe(siteId, start, end);
  }

  @GetMapping("/{inverterId}")
  public List<InverterGeneration> getGenerationByInverterId(@PathVariable String inverterId) {
    return generationService.getGenerationByInverterId(inverterId);
  }

  @GetMapping("/{inverterId}/timeframe")
  public List<InverterGeneration> getGenerationByTimeframe(
      @PathVariable String inverterId,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
    return generationService.getGenerationForTimeframe(inverterId, start, end);
  }

  @GetMapping("/anomalies")
  public List<InverterGeneration> getAnomalies() {
    return generationService.getAnomalies();
  }
}
