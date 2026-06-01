CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core entity tables for users and their roles
CREATE TABLE Users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL CHECK(role IN ('owner', 'doctor')),
    image_url TEXT,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE NULL
);

-- Users.id as primary key (1:1 relationship).
-- One UUID covers authentication (Users lookup), account identity, and
CREATE TABLE Owners (
    id UUID PRIMARY KEY REFERENCES Users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE Doctors (
    id UUID PRIMARY KEY REFERENCES Users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    clinic_name VARCHAR(255),
    clinic_address VARCHAR(255)
);

-- Core entity for pets
CREATE TABLE Pets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES Owners(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    breed VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    weight DECIMAL(5, 2) NOT NULL
);

-- Health record tables
CREATE TABLE Health_Records_Lifelong (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID NOT NULL REFERENCES Pets(id) ON DELETE CASCADE,
    condition TEXT NOT NULL,
    treatment TEXT NOT NULL,
    CONSTRAINT unq_lifelong_condition UNIQUE (pet_id, condition)
);

CREATE TABLE Health_Records_Active (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID NOT NULL REFERENCES Pets(id) ON DELETE CASCADE,
    condition TEXT NOT NULL,
    treatment TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    CONSTRAINT unq_active_condition UNIQUE (pet_id, condition)
);

-- Scheduling tables
CREATE TABLE Availabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES Doctors(id) ON DELETE CASCADE,
    available_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT unq_doctor_availability UNIQUE (doctor_id, available_datetime)
);

DO $$ BEGIN
    CREATE TYPE AppointmentStatus AS ENUM ('Pending', 'Confirmed', 'Upcoming', 'Start', 'Completed', 'Denied', 'Cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE Appointments (
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

CREATE UNIQUE INDEX unq_doctor_appointment_active
ON Appointments (doctor_id, appointment_datetime)
WHERE status NOT IN ('Cancelled', 'Denied');

-- Keep Specializations as a simple lookup table
CREATE TABLE Specializations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE
);

-- Services should also be a simple lookup table of all possible services
CREATE TABLE Services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE Doctor_Specializations (
    doctor_id UUID NOT NULL REFERENCES Doctors(id) ON DELETE CASCADE,
    specialization_id UUID NOT NULL REFERENCES Specializations(id) ON DELETE CASCADE,
    PRIMARY KEY (doctor_id, specialization_id)
);

CREATE TABLE Specialization_Services (
    specialization_id UUID NOT NULL REFERENCES Specializations(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES Services(id) ON DELETE CASCADE,
    PRIMARY KEY (specialization_id, service_id)
);

CREATE TABLE Doctor_Service_Pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL,
    specialization_id UUID NOT NULL,
    service_id UUID NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    CONSTRAINT unq_doctor_service_specialization UNIQUE (doctor_id, specialization_id, service_id),
    FOREIGN KEY (doctor_id, specialization_id)
      REFERENCES Doctor_Specializations(doctor_id, specialization_id)
      ON DELETE CASCADE,
    FOREIGN KEY (specialization_id, service_id)
      REFERENCES Specialization_Services(specialization_id, service_id)
      ON DELETE CASCADE
);

CREATE TABLE PasswordResetTokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_token_hash ON PasswordResetTokens(token_hash);

-- AuditEvents table
CREATE TABLE AuditEvents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    actor_user_id UUID NULL REFERENCES Users(id) ON DELETE SET NULL,
    actor_role VARCHAR(50) NULL,
    ip VARCHAR(64) NULL,
    user_agent TEXT NULL,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(64) NULL,
    target_user_id UUID NULL REFERENCES Users(id) ON DELETE SET NULL,
    target_id VARCHAR(128) NULL,
    outcome VARCHAR(32) NOT NULL CHECK (outcome IN ('success','failure','denied')),
    metadata JSONB NULL
);

CREATE INDEX idx_audit_actor_time ON AuditEvents (actor_user_id, occurred_at DESC);
CREATE INDEX idx_audit_action_time ON AuditEvents (action, occurred_at DESC);

-- EmailVerificationTokens table
CREATE TABLE EmailVerificationTokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX idx_email_verification_token_hash ON EmailVerificationTokens (token_hash);
CREATE INDEX idx_email_verification_user_id ON EmailVerificationTokens (user_id);
