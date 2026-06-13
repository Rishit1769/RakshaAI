-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'volunteer', 'police', 'admin', 'guardian', 'super_admin', 'organization_admin', 'worker');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('police', 'ngo', 'medical', 'government');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('pending', 'approved', 'suspended', 'rejected');

-- CreateEnum
CREATE TYPE "WorkerType" AS ENUM ('police_officer', 'volunteer', 'coordinator', 'ngo_worker', 'custom');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('female', 'male', 'non_binary', 'prefer_not_to_say');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('pending', 'active', 'accepted', 'resolved', 'false_alarm', 'escalated', 'cancelled');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('harassment', 'assault', 'medical_emergency', 'kidnapping_risk', 'cyberstalking', 'suspicious_activity', 'general_danger', 'stalking', 'theft');

-- CreateEnum
CREATE TYPE "SosTriggerMethod" AS ENUM ('tap', 'long_press', 'voice', 'shake', 'silent', 'hidden_trigger', 'auto_journey');

-- CreateEnum
CREATE TYPE "VolunteerStatus" AS ENUM ('available', 'busy', 'offline', 'suspended');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'verified', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "JourneyStatus" AS ENUM ('active', 'completed', 'cancelled', 'deviation_detected', 'sos_triggered', 'delayed');

-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('unsafe_area', 'stalking', 'broken_streetlight', 'suspicious_behavior', 'unsafe_transport', 'harassment', 'poor_lighting', 'other');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('audio', 'video', 'image', 'gps_log', 'screenshot');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('sos_alert', 'journey_alert', 'volunteer_alert', 'guardian_alert', 'community_alert', 'system_alert', 'escalation_alert');

-- CreateEnum
CREATE TYPE "RouteRiskLevel" AS ENUM ('safe', 'low', 'moderate', 'high', 'critical');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('low', 'moderate', 'high', 'critical');

-- CreateEnum
CREATE TYPE "FakeCallStatus" AS ENUM ('scheduled', 'active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "CyberReportType" AS ENUM ('cyberstalking', 'fake_profile', 'blackmail', 'scam', 'harassment', 'doxxing');

-- CreateEnum
CREATE TYPE "TransportAlertType" AS ENUM ('route_deviation', 'suspicious_stoppage', 'speed_anomaly', 'unknown_vehicle');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(15) NOT NULL,
    "aadhaar_number" VARCHAR(12),
    "password_hash" TEXT NOT NULL,
    "mpin_hash" TEXT,
    "mpin_enabled" BOOLEAN NOT NULL DEFAULT false,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "gender" "Gender",
    "date_of_birth" DATE,
    "profile_image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_safety_profiles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "blood_group" VARCHAR(5),
    "medical_conditions" TEXT[],
    "allergies" TEXT[],
    "disability_notes" TEXT,
    "medications" TEXT,
    "emergency_notes" TEXT,
    "home_address" TEXT,
    "work_address" TEXT,
    "voice_sos_keyword" VARCHAR(50) NOT NULL DEFAULT 'help me',
    "shake_sensitivity" VARCHAR(10) NOT NULL DEFAULT 'medium',
    "silent_sos_enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_evidence" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_safety_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(15) NOT NULL,
    "email" VARCHAR(150),
    "relationship" VARCHAR(50) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "priority_order" INTEGER NOT NULL DEFAULT 1,
    "notify_on_sos" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_journey" BOOLEAN NOT NULL DEFAULT true,
    "can_track_live" BOOLEAN NOT NULL DEFAULT true,
    "is_app_user" BOOLEAN NOT NULL DEFAULT false,
    "linked_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device_type" VARCHAR(20),
    "device_id" VARCHAR(200),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_verifications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "email" VARCHAR(150) NOT NULL,
    "identifier" VARCHAR(150) NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "purpose" VARCHAR(30) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "status" "VolunteerStatus" NOT NULL DEFAULT 'offline',
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "aadhaar_number" VARCHAR(12),
    "aadhaar_verified" BOOLEAN NOT NULL DEFAULT false,
    "govt_id_url" TEXT,
    "selfie_url" TEXT,
    "ngo_affiliation" VARCHAR(200),
    "skills" TEXT[],
    "languages_spoken" TEXT[],
    "service_radius_km" INTEGER NOT NULL DEFAULT 5,
    "total_responses" INTEGER NOT NULL DEFAULT 0,
    "successful_responses" INTEGER NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "last_active_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_availability" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "volunteer_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volunteer_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "police_stations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(200) NOT NULL,
    "station_code" VARCHAR(20),
    "address" TEXT NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "pincode" VARCHAR(10),
    "phone_primary" VARCHAR(15),
    "phone_secondary" VARCHAR(15),
    "email" VARCHAR(150),
    "erss_linked" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "police_stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "police_accounts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "badge_number" VARCHAR(30) NOT NULL,
    "rank" VARCHAR(50),
    "station_id" UUID NOT NULL,
    "is_on_duty" BOOLEAN NOT NULL DEFAULT false,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "govt_id_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "police_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_alerts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "alert_code" VARCHAR(20) NOT NULL,
    "user_id" UUID NOT NULL,
    "trigger_method" "SosTriggerMethod" NOT NULL,
    "alert_type" "AlertType" NOT NULL DEFAULT 'general_danger',
    "status" "AlertStatus" NOT NULL DEFAULT 'pending',
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'high',
    "description" TEXT,
    "trigger_latitude" DOUBLE PRECISION NOT NULL,
    "trigger_longitude" DOUBLE PRECISION NOT NULL,
    "trigger_address" TEXT,
    "current_latitude" DOUBLE PRECISION,
    "current_longitude" DOUBLE PRECISION,
    "assigned_volunteer_id" UUID,
    "assigned_police_id" UUID,
    "assigned_station_id" UUID,
    "ai_classification" "AlertType",
    "ai_confidence_score" DECIMAL(5,4),
    "ai_risk_score" DECIMAL(5,4),
    "escalated_at" TIMESTAMP(3),
    "escalation_reason" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolution_notes" TEXT,
    "volunteer_eta_seconds" INTEGER,
    "police_eta_seconds" INTEGER,
    "is_test_alert" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sos_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_status_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "alert_id" UUID NOT NULL,
    "changed_by_id" UUID,
    "changed_by_role" "UserRole",
    "old_status" "AlertStatus",
    "new_status" "AlertStatus" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_notifications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "alert_id" UUID NOT NULL,
    "recipient_id" UUID,
    "recipient_phone" VARCHAR(15),
    "recipient_email" VARCHAR(150),
    "notification_type" "NotificationType" NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "message" TEXT,
    "is_delivered" BOOLEAN NOT NULL DEFAULT false,
    "delivered_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_locations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy_meters" DECIMAL(8,2),
    "altitude_meters" DECIMAL(8,2),
    "speed_mps" DECIMAL(8,4),
    "bearing_degrees" DECIMAL(6,2),
    "battery_level" INTEGER,
    "is_sharing" BOOLEAN NOT NULL DEFAULT true,
    "alert_id" UUID,
    "journey_id" UUID,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journeys" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "origin_latitude" DOUBLE PRECISION NOT NULL,
    "origin_longitude" DOUBLE PRECISION NOT NULL,
    "origin_address" TEXT,
    "destination_latitude" DOUBLE PRECISION NOT NULL,
    "destination_longitude" DOUBLE PRECISION NOT NULL,
    "destination_address" TEXT,
    "route_risk_level" "RouteRiskLevel" NOT NULL DEFAULT 'safe',
    "status" "JourneyStatus" NOT NULL DEFAULT 'active',
    "expected_arrival_at" TIMESTAMP(3) NOT NULL,
    "actual_arrival_at" TIMESTAMP(3),
    "transport_mode" VARCHAR(20) NOT NULL DEFAULT 'walking',
    "vehicle_number" VARCHAR(20),
    "distance_km" DECIMAL(8,3),
    "total_duration_mins" INTEGER,
    "deviation_detected" BOOLEAN NOT NULL DEFAULT false,
    "deviation_at" TIMESTAMP(3),
    "deviation_latitude" DOUBLE PRECISION,
    "deviation_longitude" DOUBLE PRECISION,
    "guardians_notified" UUID[],
    "sos_triggered" BOOLEAN NOT NULL DEFAULT false,
    "area_safety_rating" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geofences" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "journey_id" UUID,
    "name" VARCHAR(100),
    "boundary_json" TEXT,
    "alert_on_enter" BOOLEAN NOT NULL DEFAULT false,
    "alert_on_exit" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geofences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_hotspots" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "category" "ReportCategory" NOT NULL,
    "title" VARCHAR(200),
    "description" TEXT,
    "risk_score" DECIMAL(5,4) NOT NULL DEFAULT 0.0,
    "report_count" INTEGER NOT NULL DEFAULT 1,
    "verified_count" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "peak_danger_hours" INTEGER[],
    "last_incident_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_hotspots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_reports" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "reporter_id" UUID,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT true,
    "category" "ReportCategory" NOT NULL,
    "title" VARCHAR(200),
    "description" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "city" VARCHAR(100),
    "image_urls" TEXT[],
    "upvote_count" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pin_color" VARCHAR(20) NOT NULL DEFAULT 'white',
    "alert_sent" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" UUID,
    "hotspot_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_upvotes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "report_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_upvotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_comments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "report_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safe_zones" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(200) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "city" VARCHAR(100),
    "phone" VARCHAR(15),
    "is_24x7" BOOLEAN NOT NULL DEFAULT false,
    "operating_hours" JSONB,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "added_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safe_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_risk_analyses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "time_of_analysis" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "risk_score" DECIMAL(5,4) NOT NULL,
    "risk_level" "RouteRiskLevel" NOT NULL,
    "contributing_factors" JSONB,
    "nearby_incidents" INTEGER NOT NULL DEFAULT 0,
    "nearby_hotspots" INTEGER NOT NULL DEFAULT 0,
    "recommended_actions" TEXT[],
    "safe_zones_nearby" INTEGER NOT NULL DEFAULT 0,
    "model_version" VARCHAR(20) NOT NULL DEFAULT 'gemini-1.5-pro',
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_risk_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_emergency_classifications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "alert_id" UUID NOT NULL,
    "input_text" TEXT,
    "audio_transcript" TEXT,
    "classified_type" "AlertType" NOT NULL,
    "confidence_score" DECIMAL(5,4) NOT NULL,
    "secondary_type" "AlertType",
    "secondary_confidence" DECIMAL(5,4),
    "recommended_response" TEXT,
    "escalate_to_police" BOOLEAN NOT NULL DEFAULT false,
    "model_used" VARCHAR(50) NOT NULL DEFAULT 'gemini-1.5-pro',
    "tokens_used" INTEGER,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_emergency_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_route_recommendations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "journey_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "origin_lat" DOUBLE PRECISION NOT NULL,
    "origin_lng" DOUBLE PRECISION NOT NULL,
    "destination_lat" DOUBLE PRECISION NOT NULL,
    "destination_lng" DOUBLE PRECISION NOT NULL,
    "alternative_routes" JSONB,
    "risk_level" "RouteRiskLevel" NOT NULL,
    "risk_factors" TEXT[],
    "distance_km" DECIMAL(8,3),
    "duration_mins" INTEGER,
    "safer_by_percent" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_route_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_evidence" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "alert_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "evidence_type" "EvidenceType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size_bytes" BIGINT,
    "duration_seconds" INTEGER,
    "thumbnail_url" TEXT,
    "captured_latitude" DOUBLE PRECISION,
    "captured_longitude" DOUBLE PRECISION,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_encrypted" BOOLEAN NOT NULL DEFAULT true,
    "encryption_key_ref" TEXT,
    "checksum_sha256" TEXT NOT NULL,
    "is_shared_with_police" BOOLEAN NOT NULL DEFAULT false,
    "shared_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gps_evidence_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "alert_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy_meters" DECIMAL(8,2),
    "speed_mps" DECIMAL(8,4),
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gps_evidence_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_trips" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "journey_id" UUID,
    "vehicle_number" VARCHAR(20),
    "vehicle_number_ocr" VARCHAR(20),
    "ocr_confidence" DECIMAL(5,4),
    "vehicle_type" VARCHAR(30),
    "driver_name" VARCHAR(100),
    "ride_app" VARCHAR(50),
    "ride_id" VARCHAR(100),
    "start_latitude" DOUBLE PRECISION,
    "start_longitude" DOUBLE PRECISION,
    "start_address" TEXT,
    "end_latitude" DOUBLE PRECISION,
    "end_longitude" DOUBLE PRECISION,
    "end_address" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "alert_type" "TransportAlertType",
    "alert_triggered" BOOLEAN NOT NULL DEFAULT false,
    "alert_triggered_at" TIMESTAMP(3),
    "alert_id" UUID,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fake_calls" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "caller_name" VARCHAR(100) NOT NULL DEFAULT 'Maa',
    "caller_number" VARCHAR(15),
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "delay_seconds" INTEGER NOT NULL DEFAULT 0,
    "status" "FakeCallStatus" NOT NULL DEFAULT 'scheduled',
    "script_used" VARCHAR(50) NOT NULL DEFAULT 'family_checkin',
    "trigger_latitude" DOUBLE PRECISION,
    "trigger_longitude" DOUBLE PRECISION,
    "triggered_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fake_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cyber_reports" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "reporter_id" UUID NOT NULL,
    "report_type" "CyberReportType" NOT NULL,
    "platform" VARCHAR(100),
    "perpetrator_username" VARCHAR(200),
    "perpetrator_profile" TEXT,
    "description" TEXT NOT NULL,
    "evidence_urls" TEXT[],
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(30) NOT NULL DEFAULT 'received',
    "assigned_to" UUID,
    "police_complaint_no" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cyber_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" VARCHAR(10) NOT NULL,
    "device_id" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "notification_type" "NotificationType" NOT NULL,
    "title" VARCHAR(200),
    "body" TEXT,
    "data" JSONB,
    "channel" VARCHAR(20) NOT NULL,
    "reference_id" UUID,
    "is_delivered" BOOLEAN NOT NULL DEFAULT false,
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardian_tracking_sessions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "guardian_id" UUID NOT NULL,
    "tracked_user_id" UUID NOT NULL,
    "alert_id" UUID,
    "journey_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardian_tracking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organization_name" VARCHAR(200) NOT NULL,
    "organization_type" "OrganizationType" NOT NULL,
    "description" TEXT,
    "email" VARCHAR(150),
    "phone" VARCHAR(15),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "pincode" VARCHAR(10),
    "logo_url" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'pending',
    "created_by_id" UUID NOT NULL,
    "approved_at" TIMESTAMP(3),
    "suspended_at" TIMESTAMP(3),
    "suspend_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "organization_id" UUID NOT NULL,
    "worker_type" "WorkerType" NOT NULL,
    "custom_role" VARCHAR(100),
    "email" VARCHAR(150) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(15),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "actor_id" UUID,
    "actor_role" "UserRole",
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_aadhaar_number_key" ON "users"("aadhaar_number");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_phone" ON "users"("phone");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "user_safety_profiles_user_id_key" ON "user_safety_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_emergency_contacts_user" ON "emergency_contacts"("user_id");

-- CreateIndex
CREATE INDEX "idx_sessions_user_id" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "idx_sessions_token" ON "user_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "idx_otp_verifications_email" ON "otp_verifications"("email");

-- CreateIndex
CREATE UNIQUE INDEX "volunteers_user_id_key" ON "volunteers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "police_stations_station_code_key" ON "police_stations"("station_code");

-- CreateIndex
CREATE UNIQUE INDEX "police_accounts_user_id_key" ON "police_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "police_accounts_badge_number_key" ON "police_accounts"("badge_number");

-- CreateIndex
CREATE UNIQUE INDEX "sos_alerts_alert_code_key" ON "sos_alerts"("alert_code");

-- CreateIndex
CREATE INDEX "idx_sos_alerts_user_id" ON "sos_alerts"("user_id");

-- CreateIndex
CREATE INDEX "idx_sos_alerts_status" ON "sos_alerts"("status");

-- CreateIndex
CREATE INDEX "idx_sos_alerts_created_at" ON "sos_alerts"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_alert_notifications_alert" ON "alert_notifications"("alert_id");

-- CreateIndex
CREATE INDEX "idx_user_locations_user_id" ON "user_locations"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_locations_recorded" ON "user_locations"("recorded_at" DESC);

-- CreateIndex
CREATE INDEX "idx_journeys_user_id" ON "journeys"("user_id");

-- CreateIndex
CREATE INDEX "idx_journeys_status" ON "journeys"("status");

-- CreateIndex
CREATE INDEX "idx_hotspots_city" ON "safety_hotspots"("city");

-- CreateIndex
CREATE INDEX "idx_community_reports_created" ON "community_reports"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "report_upvotes_report_id_user_id_key" ON "report_upvotes"("report_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_report_comments_report_created" ON "report_comments"("report_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_safe_zones_type" ON "safe_zones"("type");

-- CreateIndex
CREATE INDEX "idx_ai_risk_user_id" ON "ai_risk_analyses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_route_recommendations_journey_id_key" ON "ai_route_recommendations"("journey_id");

-- CreateIndex
CREATE INDEX "idx_evidence_alert_id" ON "emergency_evidence"("alert_id");

-- CreateIndex
CREATE INDEX "idx_evidence_user_id" ON "emergency_evidence"("user_id");

-- CreateIndex
CREATE INDEX "idx_gps_logs_alert_id" ON "gps_evidence_logs"("alert_id");

-- CreateIndex
CREATE INDEX "idx_gps_logs_recorded" ON "gps_evidence_logs"("recorded_at");

-- CreateIndex
CREATE INDEX "idx_transport_user_id" ON "transport_trips"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_user_id_device_id_key" ON "push_tokens"("user_id", "device_id");

-- CreateIndex
CREATE INDEX "idx_notif_logs_user" ON "notification_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_notif_logs_type" ON "notification_logs"("notification_type");

-- CreateIndex
CREATE INDEX "guardian_tracking_sessions_guardian_id_idx" ON "guardian_tracking_sessions"("guardian_id");

-- CreateIndex
CREATE INDEX "guardian_tracking_sessions_tracked_user_id_idx" ON "guardian_tracking_sessions"("tracked_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_email_key" ON "organizations"("email");

-- CreateIndex
CREATE INDEX "idx_organizations_status" ON "organizations"("status");

-- CreateIndex
CREATE INDEX "idx_organizations_type" ON "organizations"("organization_type");

-- CreateIndex
CREATE UNIQUE INDEX "workers_user_id_key" ON "workers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workers_email_key" ON "workers"("email");

-- CreateIndex
CREATE INDEX "idx_workers_org_id" ON "workers"("organization_id");

-- CreateIndex
CREATE INDEX "idx_workers_email" ON "workers"("email");

-- CreateIndex
CREATE INDEX "idx_audit_logs_actor" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "idx_audit_logs_created" ON "audit_logs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "user_safety_profiles" ADD CONSTRAINT "user_safety_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteers" ADD CONSTRAINT "volunteers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_availability" ADD CONSTRAINT "volunteer_availability_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_accounts" ADD CONSTRAINT "police_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_accounts" ADD CONSTRAINT "police_accounts_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "police_stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_alerts" ADD CONSTRAINT "sos_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_alerts" ADD CONSTRAINT "sos_alerts_assigned_volunteer_id_fkey" FOREIGN KEY ("assigned_volunteer_id") REFERENCES "volunteers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_alerts" ADD CONSTRAINT "sos_alerts_assigned_police_id_fkey" FOREIGN KEY ("assigned_police_id") REFERENCES "police_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_alerts" ADD CONSTRAINT "sos_alerts_assigned_station_id_fkey" FOREIGN KEY ("assigned_station_id") REFERENCES "police_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_status_history" ADD CONSTRAINT "alert_status_history_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "sos_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_status_history" ADD CONSTRAINT "alert_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_notifications" ADD CONSTRAINT "alert_notifications_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "sos_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geofences" ADD CONSTRAINT "geofences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geofences" ADD CONSTRAINT "geofences_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_hotspot_id_fkey" FOREIGN KEY ("hotspot_id") REFERENCES "safety_hotspots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_upvotes" ADD CONSTRAINT "report_upvotes_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "community_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_upvotes" ADD CONSTRAINT "report_upvotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_comments" ADD CONSTRAINT "report_comments_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "community_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_comments" ADD CONSTRAINT "report_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safe_zones" ADD CONSTRAINT "safe_zones_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_risk_analyses" ADD CONSTRAINT "ai_risk_analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_emergency_classifications" ADD CONSTRAINT "ai_emergency_classifications_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "sos_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_route_recommendations" ADD CONSTRAINT "ai_route_recommendations_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_route_recommendations" ADD CONSTRAINT "ai_route_recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_evidence" ADD CONSTRAINT "emergency_evidence_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "sos_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_evidence" ADD CONSTRAINT "emergency_evidence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gps_evidence_logs" ADD CONSTRAINT "gps_evidence_logs_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "sos_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gps_evidence_logs" ADD CONSTRAINT "gps_evidence_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_trips" ADD CONSTRAINT "transport_trips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_trips" ADD CONSTRAINT "transport_trips_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_trips" ADD CONSTRAINT "transport_trips_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "sos_alerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fake_calls" ADD CONSTRAINT "fake_calls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cyber_reports" ADD CONSTRAINT "cyber_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cyber_reports" ADD CONSTRAINT "cyber_reports_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_tracking_sessions" ADD CONSTRAINT "guardian_tracking_sessions_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_tracking_sessions" ADD CONSTRAINT "guardian_tracking_sessions_tracked_user_id_fkey" FOREIGN KEY ("tracked_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

