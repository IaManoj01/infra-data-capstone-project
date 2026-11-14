package com.solarfarm.solar_farm_service.service;

import com.solarfarm.solar_farm_service.entity.FaultTicket;
import com.solarfarm.solar_farm_service.entity.TicketStatus;
import com.solarfarm.solar_farm_service.repository.FaultTicketRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FaultTicketService {

  private final FaultTicketRepository faultTicketRepository;

  public List<FaultTicket> getAllTickets(
      String siteId, String inverterId, TicketStatus status, String faultType) {
    List<FaultTicket> tickets = faultTicketRepository.findAllByOrderByTimestampDesc();

    return tickets.stream()
        .filter(
            t ->
                siteId == null
                    || siteId.isBlank()
                    || "ALL".equalsIgnoreCase(siteId)
                    || siteId.equalsIgnoreCase(t.getSiteId()))
        .filter(
            t ->
                inverterId == null
                    || inverterId.isBlank()
                    || "ALL".equalsIgnoreCase(inverterId)
                    || inverterId.equalsIgnoreCase(t.getInverterId()))
        .filter(t -> status == null || t.getStatus() == status)
        .filter(
            t ->
                faultType == null
                    || faultType.isBlank()
                    || "ALL".equalsIgnoreCase(faultType)
                    || faultType.equalsIgnoreCase(t.getFaultType()))
        .collect(Collectors.toList());
  }

  public Optional<FaultTicket> getTicketById(Long ticketId) {
    return faultTicketRepository.findById(ticketId);
  }

  @Transactional
  public FaultTicket updateTicketStatus(
      Long ticketId, TicketStatus status, String resolutionNotes) {
    FaultTicket ticket =
        faultTicketRepository
            .findById(ticketId)
            .orElseThrow(
                () -> new IllegalArgumentException("Ticket not found with id: " + ticketId));

    ticket.setStatus(status);

    if (resolutionNotes != null && !resolutionNotes.isBlank()) {
      String existingNotes = ticket.getNotes() != null ? ticket.getNotes() : "";
      ticket.setNotes(
          existingNotes
              + (existingNotes.isEmpty() ? "" : " | ")
              + "[Status "
              + status
              + "]: "
              + resolutionNotes);
    }

    return faultTicketRepository.save(ticket);
  }

  @Transactional
  public FaultTicket closeTicket(Long ticketId, String resolutionNotes) {
    return updateTicketStatus(ticketId, TicketStatus.CLOSED, resolutionNotes);
  }

  @Transactional
  public FaultTicket createTicket(FaultTicket ticket) {
    if (ticket.getTimestamp() == null) {
      ticket.setTimestamp(LocalDateTime.now());
    }
    if (ticket.getStatus() == null) {
      ticket.setStatus(TicketStatus.OPEN);
    }
    return faultTicketRepository.save(ticket);
  }
}
