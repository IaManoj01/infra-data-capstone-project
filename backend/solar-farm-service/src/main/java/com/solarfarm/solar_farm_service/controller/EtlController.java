package com.solarfarm.solar_farm_service.controller;

import com.solarfarm.solar_farm_service.dto.EtlBatchResponse;
import com.solarfarm.solar_farm_service.service.DataTransformationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/etl")
@CrossOrigin(origins = "*")
public class EtlController {

  private final DataTransformationService dataTransformationService;

  public EtlController(DataTransformationService dataTransformationService) {
    this.dataTransformationService = dataTransformationService;
  }

  @PostMapping("/run")
  public ResponseEntity<EtlBatchResponse> runEtl() {

    EtlBatchResponse response = dataTransformationService.cleanAndTransformData();

    return ResponseEntity.ok(response);
  }
}
