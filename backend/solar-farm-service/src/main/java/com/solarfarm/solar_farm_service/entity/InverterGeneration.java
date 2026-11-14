package com.solarfarm.solar_farm_service.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "clean_generation",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "uk_clean_generation_reading",
          columnNames = {"timestamp", "site_id", "inverter_id"})
    })
@Getter
@Setter
@NoArgsConstructor
public class InverterGeneration {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "site_id", nullable = false)
  private String siteId;

  @Column(name = "inverter_id", nullable = false)
  private String inverterId;

  @Column(name = "`timestamp`", nullable = false)
  private LocalDateTime timestamp;

  @Column(name = "dc_power_kw")
  private Double dcPowerKw;

  @Column(name = "ac_power_kw")
  private Double acPowerKw;

  @Column(name = "interval_energy_kwh")
  private Double intervalEnergyKwh;

  @Column(name = "grid_voltage_v")
  private Double gridVoltageV;

  @Column(name = "power_factor")
  private Double powerFactor;

  @Column(name = "status_flag")
  private String statusFlag;
}
