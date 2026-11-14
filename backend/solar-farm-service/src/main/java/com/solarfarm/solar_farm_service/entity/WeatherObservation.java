package com.solarfarm.solar_farm_service.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "clean_weather",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "uk_clean_weather_reading",
          columnNames = {"timestamp", "site_id"})
    })
@Getter
@Setter
@NoArgsConstructor
public class WeatherObservation {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "site_id", nullable = false)
  private String siteId;

  @Column(name = "`timestamp`", nullable = false)
  private LocalDateTime timestamp;

  @Column(name = "irradiance_w_m2")
  private Double irradianceWM2;

  @Column(name = "ambient_temp_c")
  private Double ambientTempC;

  @Column(name = "module_temp_c")
  private Double moduleTempC;

  @Column(name = "cloud_cover_pct")
  private Double cloudCoverPct;
}
