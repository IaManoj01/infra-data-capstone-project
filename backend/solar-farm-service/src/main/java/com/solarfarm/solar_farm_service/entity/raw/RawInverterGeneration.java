package com.solarfarm.solar_farm_service.entity.raw;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "stg_generation")
@IdClass(RawInverterGenerationId.class)
@Getter
@Setter
@NoArgsConstructor
public class RawInverterGeneration {

  @Id
  @Column(name = "`timestamp`")
  private LocalDateTime timestamp;

  @Id
  @Column(name = "site_id")
  private String siteId;

  @Id
  @Column(name = "inverter_id")
  private String inverterId;

  @Column(name = "dc_power_kw")
  private Double dcPowerKw;

  @Column(name = "ac_power_kw")
  private Double acPowerKw;

  @Column(name = "energy_kwh")
  private Double energyKwh;

  @Column(name = "grid_voltage_v")
  private Double gridVoltageV;

  @Column(name = "power_factor")
  private Double powerFactor;
}
