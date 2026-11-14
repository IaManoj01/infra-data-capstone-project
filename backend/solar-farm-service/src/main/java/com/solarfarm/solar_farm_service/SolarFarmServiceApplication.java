package com.solarfarm.solar_farm_service;

import java.sql.Connection;
import javax.sql.DataSource;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class SolarFarmServiceApplication {

  public static void main(String[] args) {
    SpringApplication.run(SolarFarmServiceApplication.class, args);
  }

  // This bean runs automatically when the app starts up and tests the database connection
  @Bean
  CommandLineRunner testDatabaseConnection(DataSource dataSource) {
    return args -> {
      try (Connection connection = dataSource.getConnection()) {
        System.out.println("==================================================");
        System.out.println(" SUCCESS: Successfully connected to MySQL Database!");
        System.out.println(" Database URL: " + connection.getMetaData().getURL());
        System.out.println("==================================================");
      } catch (Exception e) {
        System.err.println("==================================================");
        System.err.println(" FAILED: Could not connect to MySQL Database!");
        System.err.println(" Error: " + e.getMessage());
        System.err.println("==================================================");
      }
    };
  }
}
