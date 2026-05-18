/* eslint-disable camelcase */

// Baseline migration. Mirrors database.sql with idempotent guards so it can be
// safely applied on:
//   - a fresh DB that already ran database.sql via docker-entrypoint-initdb.d
//   - an existing dev/staging DB that pre-dates node-pg-migrate
// Both cases converge to "tables exist + pgmigrations row exists".
//
// All NEW schema work happens in subsequent timestamped migration files —
// never edit this baseline.

exports.up = (pgm) => {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS Users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(50) NOT NULL CHECK(role IN ('owner', 'doctor')),
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS Owners (
      id UUID PRIMARY KEY REFERENCES Users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Doctors (
      id UUID PRIMARY KEY REFERENCES Users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      clinic_name VARCHAR(255),
      clinic_address VARCHAR(255)
    );

    CREATE TABLE IF NOT EXISTS Pets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      owner_id UUID NOT NULL REFERENCES Owners(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(100) NOT NULL,
      breed VARCHAR(100) NOT NULL,
      age INT NOT NULL,
      weight DECIMAL(5, 2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Health_Records_Lifelong (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      pet_id UUID NOT NULL REFERENCES Pets(id) ON DELETE CASCADE,
      condition TEXT NOT NULL,
      treatment TEXT NOT NULL,
      CONSTRAINT unq_lifelong_condition UNIQUE (pet_id, condition)
    );

    CREATE TABLE IF NOT EXISTS Health_Records_Active (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      pet_id UUID NOT NULL REFERENCES Pets(id) ON DELETE CASCADE,
      condition TEXT NOT NULL,
      treatment TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE,
      CONSTRAINT unq_active_condition UNIQUE (pet_id, condition)
    );

    CREATE TABLE IF NOT EXISTS Availabilities (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      doctor_id UUID NOT NULL REFERENCES Doctors(id) ON DELETE CASCADE,
      available_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
      CONSTRAINT unq_doctor_availability UNIQUE (doctor_id, available_datetime)
    );

    DO $$ BEGIN
      CREATE TYPE AppointmentStatus AS ENUM (
        'Pending','Confirmed','Upcoming','Start','Completed','Denied','Cancelled'
      );
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS Appointments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      pet_id UUID NOT NULL REFERENCES Pets(id) ON DELETE CASCADE,
      doctor_id UUID NOT NULL REFERENCES Doctors(id) ON DELETE CASCADE,
      appointment_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
      status AppointmentStatus NOT NULL,
      reason TEXT,
      consultation_type TEXT,
      investigation TEXT,
      investigation_result TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS unq_doctor_appointment_active
      ON Appointments (doctor_id, appointment_datetime)
      WHERE status NOT IN ('Cancelled', 'Denied');

    CREATE TABLE IF NOT EXISTS Specializations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS Services (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS Doctor_Specializations (
      doctor_id UUID NOT NULL REFERENCES Doctors(id) ON DELETE CASCADE,
      specialization_id UUID NOT NULL REFERENCES Specializations(id) ON DELETE CASCADE,
      PRIMARY KEY (doctor_id, specialization_id)
    );

    CREATE TABLE IF NOT EXISTS Specialization_Services (
      specialization_id UUID NOT NULL REFERENCES Specializations(id) ON DELETE CASCADE,
      service_id UUID NOT NULL REFERENCES Services(id) ON DELETE CASCADE,
      PRIMARY KEY (specialization_id, service_id)
    );

    CREATE TABLE IF NOT EXISTS Doctor_Service_Pricing (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      doctor_id UUID NOT NULL,
      specialization_id UUID NOT NULL,
      service_id UUID NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      CONSTRAINT unq_doctor_service_specialization
        UNIQUE (doctor_id, specialization_id, service_id),
      FOREIGN KEY (doctor_id, specialization_id)
        REFERENCES Doctor_Specializations(doctor_id, specialization_id)
        ON DELETE CASCADE,
      FOREIGN KEY (specialization_id, service_id)
        REFERENCES Specialization_Services(specialization_id, service_id)
        ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS PasswordResetTokens (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
      token_hash VARCHAR(64) NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE INDEX IF NOT EXISTS idx_token_hash ON PasswordResetTokens(token_hash);
  `);
};

// Intentionally a no-op. The baseline represents the starting point of
// migration history; reversing it would mean dropping the entire schema,
// which is never something we want a migration framework to do for us.
exports.down = () => {};
