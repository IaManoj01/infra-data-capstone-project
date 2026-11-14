package com.solarfarm.solar_farm_service.dto;

public class EtlBatchResponse {

  private String status;

  private int weatherRead;
  private int weatherInserted;

  private int generationRead;
  private int generationInserted;

  private int ticketsCreated;

  private String message;

  public EtlBatchResponse(
      String status,
      int weatherRead,
      int weatherInserted,
      int generationRead,
      int generationInserted,
      int ticketsCreated,
      String message) {
    this.status = status;
    this.weatherRead = weatherRead;
    this.weatherInserted = weatherInserted;
    this.generationRead = generationRead;
    this.generationInserted = generationInserted;
    this.ticketsCreated = ticketsCreated;
    this.message = message;
  }

  public String getStatus() {
    return status;
  }

  public int getWeatherRead() {
    return weatherRead;
  }

  public int getWeatherInserted() {
    return weatherInserted;
  }

  public int getGenerationRead() {
    return generationRead;
  }

  public int getGenerationInserted() {
    return generationInserted;
  }

  public int getTicketsCreated() {
    return ticketsCreated;
  }

  public int getFaultTicketsCreated() {
    return ticketsCreated;
  }

  public String getMessage() {
    return message;
  }
}
