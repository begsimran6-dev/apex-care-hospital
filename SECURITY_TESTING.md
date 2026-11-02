# APEX Care Hospital
## Security Testing Report

### Test 1: Patient Access to Admin API

- Test Date: 01 November 2026
- Test Account: Patient
- Patient User ID: 5
- API Endpoint: GET /api/admin/stats
- Expected HTTP Status: 403 Forbidden
- Actual HTTP Status: 403 Forbidden

### Result: PASSED

Patient authentication was successful.
Access to the admin API was denied.

### Evidence
security-evidence/Patient_Admin_API_403_Test.png

### Test 2: Admin Access to Admin API

- Test Account: Admin
- API Endpoint: GET /api/admin/stats
- Expected HTTP Status: 200 OK
- Actual HTTP Status: 200 OK

### Result: PASSED

The admin account successfully accessed the protected admin statistics endpoint.

### Evidence
security-evidence/Admin_API_200_Test.png

### Test 3: Invalid Token Authentication

- Test Date: 01 November 2026
- API Endpoint: GET /api/admin/stats
- Expected HTTP Status: 401 Unauthorized
- Actual HTTP Status: 401 Unauthorized

### Result: PASSED

The API rejected the invalid authentication token.

### Evidence
security-evidence/Invalid_Token_401_Test.png

### Test 4: Patient Appointment Booking and Cancellation

- Test Date: 01 November 2026
- Patient Appointment ID: 4
- Booking: Successful
- Patient cancellation: Successful
- Admin dashboard verification: Status shown as Cancelled

### Result: PASSED

The patient successfully booked and cancelled appointment #4.
The admin dashboard displayed the same appointment with Cancelled status.

### Evidence
security-evidence/Admin_Appointment_Cancellation_Verification.png

## AI Assistant Test
- Authenticated AI request: HTTP 200 OK
- Unauthenticated request: HTTP 401 Unauthorized
- Empty message: HTTP 400 Bad Request
- Bedrock response: Successfully verified
- Evidence: AI_Assistant_Bedrock_Test.png

## Final Infrastructure Verification - 01 Nov 2026
- ALB: HTTP 200 OK
- Target Group: Healthy
- Backend: PM2 Online
- RDS: Connected, not publicly accessible
- RDS Security Group: Restricted to application security group
- S3: Block Public Access enabled
- IAM: Required policies verified
- CloudWatch: Backend logs received
- CloudFront: Frontend, Login and AI Assistant verified
- RDS restore test: Pending due to AWS instance limit
