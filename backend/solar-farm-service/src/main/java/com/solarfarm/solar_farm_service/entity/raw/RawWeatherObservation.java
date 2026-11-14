package com.solarfarm.solar_farm_service.entity.raw;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "stg_weather")
@IdClass(RawWeatherObservationId.class)
@Getter
@Setter
@NoArgsConstructor
public class RawWeatherObservation {

  @Id
  @Column(name = "`timestamp`")
  private LocalDateTime timestamp;

  @Id
  @Column(name = "site_id")
  private String siteId;

  @Column(name = "irradiance_w_m2")
  private Double irradianceWM2;

  @Column(name = "ambient_temp_c")
  private Double ambientTempC;

  @Column(name = "module_temp_c")
  private Double moduleTempC;

  @Column(name = "cloud_cover_pct")
  private Double cloudCoverPct;
}
