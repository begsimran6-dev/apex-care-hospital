# APEX Care Hospital
## AWS Cloud-Based Hospital Management System

### 1. Project Overview
APEX Care Hospital is an educational hospital management project.
It provides patient registration, login, doctor information,
appointment management and admin functionalities.

### 2. AWS Infrastructure
- AWS Region: ap-south-1
- VPC: medai-vpc
- Backend: Private EC2 instance
- Database: MySQL / RDS
- Frontend hosting: Amazon S3
- Content delivery: Amazon CloudFront
- Network security: Security Groups
- Monitoring: Amazon CloudWatch

### 3. Application Backend
- Runtime: Node.js
- Entry file: index.js
- Authentication: JWT
- Authorization: authenticateToken and requireAdmin middleware

### 4. Main API Endpoints
- POST /api/register
- POST /api/login
- GET /api/doctors
- GET /api/departments
- POST /api/appointments
- GET /api/appointments
- GET /api/admin/stats
- GET /api/admin/patients
- GET /api/admin/doctors
- GET /api/admin/appointments

### 5. Database
Database name: mediai_hospital

Tables:
- users
- patients
- departments
- doctors
- appointments
- ai_chat_history
- contact_messages
- hospital_contact

### 6. Security and Functional Testing
Refer to SECURITY_TESTING.md for detailed test results.

Completed tests:
- Patient accessing admin API: 403 Forbidden
- Admin accessing admin API: 200 OK
- Invalid token: 401 Unauthorized
- Patient appointment booking: Successful
- Patient appointment cancellation: Successful
- Admin dashboard cancellation verification: Successful

### 7. Evidence
Screenshots and reports are stored in the security-evidence directory.
Evidence copies are also stored in the S3 security-evidence folder.

### 8. Project Status
Core application deployment, authorization tests and the
patient appointment booking/cancellation workflow have been tested.

This is an educational project, not a production security certification.

### 9. CloudWatch Monitoring
- CloudWatch Log Group: /apex-hospital/backend
- Log Stream: backend-output
- Log Stream: backend-error
- CloudWatch Agent: Installed and running
- Backend PM2 logs: Successfully verified in CloudWatch

### 10. RDS Backup and Recovery Verification
- RDS Instance: mediai-rds
- Database Status: Available
- Automated Backups: Enabled
- Backup Retention Period: 1 Day
- Automated Snapshots: 3 Available (verified on November 1, 2026)
- Backup Region: ap-south-1 (Mumbai)
- Actual Restore Test: Pending
- Restore test could not be completed due to the AWS Free Plan instance limit.
- Original database was not modified or deleted.


## AI Assistant - AWS Bedrock Integration

- AI model: Amazon Nova 2 Lite
- AWS Region: ap-south-1
- Backend endpoint: POST /api/ai/chat
- Authentication: JWT required
- Database: Hospital departments and active doctors
- AI service: Amazon Bedrock
- Security: Rate limiting and input validation
- Medical safety: Informational responses only; no diagnosis or prescriptions.
- Verification: Successful AI response received through the frontend.
- Evidence: s3://medai-apex-hospital/security-evidence/AI_Assistant_Bedrock_Test.png

This is an educational demonstration, not a production-ready medical service.

## RDS Restore Test
- Automated backups: Available
- System snapshots: 3 available
- Original database: mediai-rds (Active)
- Restore test: Pending
- Reason: AWS Free Plan maximum DB instance limit reached
- Evidence: RDS_Restore_Limit_Error.png
- Original database remains unchanged.
