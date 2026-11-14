package com.solarfarm.solar_farm_service.dto;

import java.time.LocalDateTime;

public class EtlBatchRequest {

  private String runId;
  private String batchId;

  private LocalDateTime startTimestamp;
  private LocalDateTime endTimestamp;

  public String getRunId() {
    return runId;
  }

  public void setRunId(String runId) {
    this.runId = runId;
  }

  public String getBatchId() {
    return batchId;
  }

  public void setBatchId(String batchId) {
    this.batchId = batchId;
  }

  public LocalDateTime getStartTimestamp() {
    return startTimestamp;
  }

  public void setStartTimestamp(LocalDateTime startTimestamp) {
    this.startTimestamp = startTimestamp;
  }

  public LocalDateTime getEndTimestamp() {
    return endTimestamp;
  }

  public void setEndTimestamp(LocalDateTime endTimestamp) {
    this.endTimestamp = endTimestamp;
  }
}
