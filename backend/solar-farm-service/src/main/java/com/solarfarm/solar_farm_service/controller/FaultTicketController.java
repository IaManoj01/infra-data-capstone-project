package com.solarfarm.solar_farm_service.controller;

import com.solarfarm.solar_farm_service.dto.TicketCloseRequest;
import com.solarfarm.solar_farm_service.entity.FaultTicket;
import com.solarfarm.solar_farm_service.entity.TicketStatus;
import com.solarfarm.solar_farm_service.service.FaultTicketService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fault-tickets")
@CrossOrigin(origins = "*")
public class FaultTicketController {

  private final FaultTicketService faultTicketService;

  public FaultTicketController(FaultTicketService faultTicketService) {
    this.faultTicketService = faultTicketService;
  }

  @GetMapping
  public List<FaultTicket> getAllTickets(
      @RequestParam(required = false) String siteId,
      @RequestParam(required = false) String inverterId,
      @RequestParam(required = false) TicketStatus status,
      @RequestParam(required = false) String faultType) {
    return faultTicketService.getAllTickets(siteId, inverterId, status, faultType);
  }

  @GetMapping("/{ticketId}")
  public ResponseEntity<FaultTicket> getTicketById(@PathVariable Long ticketId) {
    return faultTicketService
        .getTicketById(ticketId)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }

  @PatchMapping("/{ticketId}/status")
  public ResponseEntity<FaultTicket> updateStatus(
      @PathVariable Long ticketId,
      @RequestParam(required = false) TicketStatus status,
      @RequestBody(required = false) TicketCloseRequest request) {
    String notes = request != null ? request.getResolutionNotes() : null;
    TicketStatus targetStatus = status != null ? status : TicketStatus.IN_PROGRESS;
    try {
      FaultTicket updated = faultTicketService.updateTicketStatus(ticketId, targetStatus, notes);
      return ResponseEntity.ok(updated);
    } catch (IllegalArgumentException e) {
      return ResponseEntity.notFound().build();
    }
  }

  @PutMapping("/{ticketId}/close")
  public ResponseEntity<FaultTicket> closeTicket(
      @PathVariable Long ticketId, @RequestBody(required = false) TicketCloseRequest request) {
    String notes = request != null ? request.getResolutionNotes() : "Closed via API";
    try {
      FaultTicket closed = faultTicketService.closeTicket(ticketId, notes);
      return ResponseEntity.ok(closed);
    } catch (IllegalArgumentException e) {
      return ResponseEntity.notFound().build();
    }
  }

  @PostMapping
  public ResponseEntity<FaultTicket> createTicket(@RequestBody FaultTicket ticket) {
    FaultTicket created = faultTicketService.createTicket(ticket);
    return ResponseEntity.ok(created);
  }
}
