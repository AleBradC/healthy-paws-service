#!/bin/bash
# Seed 5 owners and 5 doctors via the registration API
# Password for all users: Test@1234

BASE_URL="http://localhost/api/auth"

echo "========================================="
echo "  Seeding 5 Owners (with pets)"
echo "========================================="

# Owner 1
echo -e "\n→ Registering Owner 1: Alexandra Brad"
curl -s -X POST "$BASE_URL/register/owner" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": {
      "name": "Alexandra Brad",
      "email": "alexandra.brad@gmail.com",
      "password": "Test@1234",
      "confirmPassword": "Test@1234"
    },
    "pet": {
      "name": "Charlie",
      "type": "Dog",
      "breed": "Golden Retriever",
      "age": 3,
      "weight": 30
    }
  }'
echo ""

# Owner 2
echo -e "\n→ Registering Owner 2: Mihai Enescu"
curl -s -X POST "$BASE_URL/register/owner" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": {
      "name": "Mihai Enescu",
      "email": "mihai.enescu@gmail.com",
      "password": "Test@1234",
      "confirmPassword": "Test@1234"
    },
    "pet": {
      "name": "Milo",
      "type": "Cat",
      "breed": "Siamese",
      "age": 2,
      "weight": 4.5
    }
  }'
echo ""

# Owner 3
echo -e "\n→ Registering Owner 3: Andreea Constantinescu"
curl -s -X POST "$BASE_URL/register/owner" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": {
      "name": "Andreea Constantinescu",
      "email": "andreea.constantinescu@gmail.com",
      "password": "Test@1234",
      "confirmPassword": "Test@1234"
    },
    "pet": {
      "name": "Bella",
      "type": "Dog",
      "breed": "French Bulldog",
      "age": 5,
      "weight": 12
    }
  }'
echo ""

# Owner 4
echo -e "\n→ Registering Owner 4: Radu Marinescu"
curl -s -X POST "$BASE_URL/register/owner" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": {
      "name": "Radu Marinescu",
      "email": "radu.marinescu@gmail.com",
      "password": "Test@1234",
      "confirmPassword": "Test@1234"
    },
    "pet": {
      "name": "Luna",
      "type": "Cat",
      "breed": "British Shorthair",
      "age": 1,
      "weight": 3.8
    }
  }'
echo ""

# Owner 5
echo -e "\n→ Registering Owner 5: Diana Florea"
curl -s -X POST "$BASE_URL/register/owner" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": {
      "name": "Diana Florea",
      "email": "diana.florea@gmail.com",
      "password": "Test@1234",
      "confirmPassword": "Test@1234"
    },
    "pet": {
      "name": "Rocky",
      "type": "Dog",
      "breed": "Labrador Retriever",
      "age": 4,
      "weight": 28
    }
  }'
echo ""

echo -e "\n========================================="
echo "  Seeding 5 Doctors"
echo "========================================="

# Doctor 1
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

# Doctor 2
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

# Doctor 3
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

# Doctor 4
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

# Doctor 5
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

echo -e "\n========================================="
echo "  Done! All 10 users seeded."
echo "  Password for all: Test@1234"
echo "========================================="
