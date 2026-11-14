package com.solarfarm.solar_farm_service.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "fault_tickets")
@Getter
@Setter
@NoArgsConstructor
public class FaultTicket {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "ticket_id")
  private Long ticketId;

  @Column(name = "timestamp", nullable = false)
  private LocalDateTime timestamp;

  @Column(name = "site_id", nullable = false)
  private String siteId;

  @Column(name = "inverter_id")
  private String inverterId;

  @Column(name = "fault_type", nullable = false)
  private String faultType;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false)
  private TicketStatus status;

  @Column(name = "notes", length = 1000)
  private String notes;
}
