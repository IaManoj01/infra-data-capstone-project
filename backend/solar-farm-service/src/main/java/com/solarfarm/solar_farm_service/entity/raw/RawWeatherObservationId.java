package com.solarfarm.solar_farm_service.entity.raw;

import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RawWeatherObservationId implements Serializable {

  private LocalDateTime timestamp;
  private String siteId;
}
