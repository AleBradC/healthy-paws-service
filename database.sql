CREATE DATABASE healthyPaws;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE Users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role VARCHAR(50) NOT NULL CHECK(role IN ('owner', 'doctor'))
    -- to do add here image url ? 
);

CREATE TABLE Owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE Doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    clinic_name VARCHAR(255),
    clinic_address VARCHAR(255)
);

CREATE TABLE Specializations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE Services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    specialization_id UUID NOT NULL REFERENCES Specializations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE Pets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES Owners(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    breed VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    weight DECIMAL(5, 2) NOT NULL
);

CREATE TABLE Health_Records_Lifelong (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID NOT NULL REFERENCES Pets(id) ON DELETE CASCADE,
    condition TEXT NOT NULL,
    treatment TEXT NOT NULL
)

CREATE TABLE Health_Records_Active (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID NOT NULL REFERENCES Pets(id) ON DELETE CASCADE,
    condition TEXT NOT NULL,
    treatment TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE
);

CREATE TABLE Availabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES Doctors(id) ON DELETE CASCADE,
    available_datetime TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE Appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID NOT NULL REFERENCES Pets(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES Doctors(id) ON DELETE CASCADE,
    appointment_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL,
    reason TEXT,
    consultation_type TEXT,
    investigation TEXT,
    investigation_result TEXT
    -- todo add key for no duplication -> doctor & date
);

-- Junction Tables (Many-to-Many Relationships)
CREATE TABLE Doctor_Specializations (
    doctor_id UUID NOT NULL REFERENCES Doctors(id) ON DELETE CASCADE,
    specialization_id UUID NOT NULL REFERENCES Specializations(id) ON DELETE CASCADE,
    PRIMARY KEY (doctor_id, specialization_id)
);

CREATE TABLE Doctor_Services (
    doctor_id UUID NOT NULL REFERENCES Doctors(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES Services(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (doctor_id, service_id)
);


-- SELECT id, name FROM Specializations;
-- ALTER TABLE Services
-- ADD CONSTRAINT services_name_specialization_id_key UNIQUE (name, specialization_id);

-- ALTER TABLE Availabilities
-- ADD CONSTRAINT unq_doctor_availability UNIQUE (doctor_id, available_datetime);
