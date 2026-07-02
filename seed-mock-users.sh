#!/bin/bash

BASE_URL="http://localhost/api/auth"

echo "========================================="
echo "  Seeding 10 Doctors"
echo "========================================="

echo -e "\n→ Registering Doctor 1: Stefan Vladescu"
curl -s -X POST "$BASE_URL/register/doctor" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor": {
      "name": "Stefan Vladescu",
      "email": "stefan.vladescu@gmail.com",
      "password": "Test@1234",
      "confirmPassword": "Test@1234",
      "clinicName": "PetCare Clinic",
      "clinicAddress": "Str. Victoriei 45, Bucuresti",
      "specializations": [
        {
          "name": "General Medicine",
          "services": [
            { "name": "Consultation", "price": 150 },
            { "name": "Vaccination", "price": 100 }
          ]
        }
      ]
    }
  }'
echo ""

echo -e "\n→ Registering Doctor 2: Cristina Moldovan"
curl -s -X POST "$BASE_URL/register/doctor" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor": {
      "name": "Cristina Moldovan",
      "email": "cristina.moldovan@gmail.com",
      "password": "Test@1234",
      "confirmPassword": "Test@1234",
      "clinicName": "Happy Paws Veterinary",
      "clinicAddress": "Bd. Unirii 12, Cluj-Napoca",
      "specializations": [
        {
          "name": "Dermatology",
          "services": [
            { "name": "Skin Examination", "price": 200 },
            { "name": "Allergy Testing", "price": 250 }
          ]
        },
        {
          "name": "Surgery",
          "services": [
            { "name": "Sterilization", "price": 500 },
            { "name": "Dental Cleaning", "price": 300 }
          ]
        }
      ]
    }
  }'
echo ""

echo -e "\n→ Registering Doctor 3: Bogdan Petrescu"
curl -s -X POST "$BASE_URL/register/doctor" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor": {
      "name": "Bogdan Petrescu",
      "email": "bogdan.petrescu@gmail.com",
      "password": "Test@1234",
      "confirmPassword": "Test@1234",
      "clinicName": "Vet Plus Center",
      "clinicAddress": "Str. Republicii 78, Timisoara",
      "specializations": [
        {
          "name": "Orthopedics",
          "services": [
            { "name": "X-Ray", "price": 180 },
            { "name": "Fracture Treatment", "price": 600 }
          ]
        }
      ]
    }
  }'
echo ""

echo -e "\n→ Registering Doctor 4: Irina Neagu"
curl -s -X POST "$BASE_URL/register/doctor" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor": {
      "name": "Irina Neagu",
      "email": "irina.neagu@gmail.com",
      "password": "Test@1234",
      "confirmPassword": "Test@1234",
      "clinicName": "Animal Health Center",
      "clinicAddress": "Calea Dorobantilor 33, Iasi",
      "specializations": [
        {
          "name": "Cardiology",
          "services": [
            { "name": "ECG", "price": 220 },
            { "name": "Heart Ultrasound", "price": 350 }
          ]
        },
        {
          "name": "Internal Medicine",
          "services": [
            { "name": "Blood Tests", "price": 120 },
            { "name": "Ultrasound", "price": 200 }
          ]
        }
      ]
    }
  }'
echo ""

echo -e "\n→ Registering Doctor 5: Adrian Popescu"
curl -s -X POST "$BASE_URL/register/doctor" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor": {
      "name": "Adrian Popescu",
      "email": "adrian.popescu@gmail.com",
      "password": "Test@1234",
      "confirmPassword": "Test@1234",
      "clinicName": "VetExpert Clinic",
      "clinicAddress": "Str. Mihai Eminescu 15, Brasov",
      "specializations": [
        {
          "name": "Ophthalmology",
          "services": [
            { "name": "Eye Examination", "price": 180 },
            { "name": "Cataract Surgery", "price": 800 }
          ]
        }
      ]
    }
  }'
echo ""

echo -e "\n→ Registering Doctor 6: Ionut Popa"
curl -s -X POST "$BASE_URL/register/doctor" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor": {
      "name": "Ionut Popa",
      "email": "ionut.popa@gmail.com",
      "password": "Test@1234",
      "confirmPassword": "Test@1234",
      "clinicName": "Paws & Claws",
      "clinicAddress": "Str. Lalelelor 1, Sibiu",
      "specializations": [
        {
          "name": "Neurology",
          "services": [
            { "name": "Consultation", "price": 250 }
          ]
        }
      ]
    }
  }'
echo ""

echo -e "\n→ Registering Doctor 7: Maria Ionescu"
curl -s -X POST "$BASE_URL/register/doctor" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor": {
      "name": "Maria Ionescu",
      "email": "maria.ionescu@gmail.com",
      "password": "Test@1234",
      "confirmPassword": "Test@1234",
      "clinicName": "CareVet",
      "clinicAddress": "Str. Garii 22, Arad",
      "specializations": [
        {
          "name": "Oncology",
          "services": [
            { "name": "Consultation", "price": 300 }
          ]
        }
      ]
    }
  }'
echo ""

echo -e "\n→ Registering Doctor 8: Elena Radu"
curl -s -X POST "$BASE_URL/register/doctor" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor": {
      "name": "Elena Radu",
      "email": "elena.radu@gmail.com",
      "password": "Test@1234",
      "confirmPassword": "Test@1234",
      "clinicName": "City Vet",
      "clinicAddress": "Bd. Carol I 15, Craiova",
      "specializations": [
        {
          "name": "Dentistry",
          "services": [
            { "name": "Dental Checkup", "price": 150 }
          ]
        }
      ]
    }
  }'
echo ""

echo -e "\n→ Registering Doctor 9: Andrei Nita"
curl -s -X POST "$BASE_URL/register/doctor" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor": {
      "name": "Andrei Nita",
      "email": "andrei.nita@gmail.com",
      "password": "Test@1234",
      "confirmPassword": "Test@1234",
      "clinicName": "Family Vet",
      "clinicAddress": "Str. Principala 9, Oradea",
      "specializations": [
        {
          "name": "Behavioral Medicine",
          "services": [
            { "name": "Behavioral Consultation", "price": 200 }
          ]
        }
      ]
    }
  }'
echo ""

echo -e "\n→ Registering Doctor 10: Gabriela Stoica"
curl -s -X POST "$BASE_URL/register/doctor" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor": {
      "name": "Gabriela Stoica",
      "email": "gabriela.stoica@gmail.com",
      "password": "Test@1234",
      "confirmPassword": "Test@1234",
      "clinicName": "Premium Vet",
      "clinicAddress": "Bd. Mamaia 44, Constanta",
      "specializations": [
        {
          "name": "Exotic Pets",
          "services": [
            { "name": "Exotic Pet Consultation", "price": 180 }
          ]
        }
      ]
    }
  }'
echo ""

echo -e "\n========================================="
echo "  Done! All 10 doctors seeded."
echo "  Password for all: Test@1234"
echo "========================================="
