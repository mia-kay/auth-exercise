# Authentication API Deployment Runbook

## 1. Overview

This runbook documents how to configure, deploy, monitor, troubleshoot, and recover the Authentication API and its frontend.

The application uses:

* **Backend:** Node.js and Express
* **Database:** MongoDB Atlas
* **Authentication:** JSON Web Tokens (JWT) and HTTP cookies
* **Frontend:** React and Vite
* **Backend hosting:** Render
* **Frontend hosting:** Vercel

### Production URLs

* **Backend:** https://auth-deployment-exercise.onrender.com
* **Frontend:** https://auth-frontend-self-pi.vercel.app
* **Health check:** https://auth-deployment-exercise.onrender.com/health

The `/health` endpoint reports whether the backend and MongoDB connection are healthy.

---

## 2. Environment Variables

Environment variables store configuration separately from application code.

Never commit secrets, database credentials, or the `.env` file to GitHub.

### Backend environment variables

| Variable           | Purpose                                                                                                                                                  | Required                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `MONGO_URI_DIRECT` | MongoDB connection string used by the backend to connect to MongoDB Atlas.                                                                               | Yes                            |
| `MONGO_URI`        | Additional MongoDB connection string retained in the project configuration. Check whether other application files use it before changing or removing it. | Depends on usage               |
| `JWT_SECRET`       | Secret used to sign and verify JSON Web Tokens. It must be private and sufficiently strong.                                                              | Yes                            |
| `JWT_EXPIRES_IN`   | Specifies how long a JWT remains valid.                                                                                                                  | Yes                            |
| `PORT`             | Port on which the backend listens. Render supplies this variable in production; locally, the application defaults to port `3000`.                        | Supplied by host in production |

The backend currently connects using `MONGO_URI_DIRECT`. Ensure this variable contains a valid MongoDB Atlas connection string.

Do not put actual secret values in this runbook.

### Frontend environment variables

| Variable       | Purpose                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| `VITE_API_URL` | Base URL used by the frontend when sending requests to the backend API. |

For local development, the frontend uses:

`http://localhost:3000`

For production, it uses:

`https://auth-deployment-exercise.onrender.com`

Vite exposes variables prefixed with `VITE_` to frontend code. Never store database credentials or other private secrets in frontend environment variables.

### Local configuration

Backend environment variables belong in:

`auth-exercise/.env`

Frontend environment variables belong in:

`auth-frontend/.env`

Both `.env` files must remain excluded from version control.

---

## 3. Deployment and Redeployment

### 3.1 Backend deployment on Render

The backend project directory is `auth-exercise`.

The backend uses the following npm scripts:

* Start command: `npm start`
* Development command: `npm run dev`

The production start command is:

`npm start`

This executes `node index.js`.

#### Initial deployment or redeployment

1. Open the Render dashboard.
2. Select the existing `auth-deployment-exercise` backend service.
3. Open its environment-variable settings.
4. Confirm that the required backend environment variables are configured correctly:

   * `MONGO_URI_DIRECT`
   * `JWT_SECRET`
   * `JWT_EXPIRES_IN`
   * Any additional variables required by the application.
5. Confirm that the service uses `npm start` as its start command.
6. Ensure the latest backend changes have been committed and pushed to the connected Git repository.
7. Trigger a new deployment from the Render dashboard if automatic deployment has not started.
8. Open the deployment logs.
9. Confirm that the MongoDB connection succeeds and the server starts.
10. Test the production health endpoint:

    `https://auth-deployment-exercise.onrender.com/health`

A healthy response should return HTTP `200 OK` and indicate that the database is connected.

If deployment fails, inspect the logs before attempting another deployment.

### 3.2 Frontend deployment on Vercel

The frontend project directory is `auth-frontend`.

#### Initial deployment or redeployment

1. Open the Vercel dashboard.

2. Select the existing `auth-frontend` project.

3. Open the project's environment-variable settings.

4. Set `VITE_API_URL` to:

   `https://auth-deployment-exercise.onrender.com`

5. Ensure the variable is configured for the Production environment.

6. Commit and push the latest frontend changes to the connected Git repository.

7. Trigger a new deployment if automatic deployment has not started.

8. Wait for the deployment to complete successfully.

9. Open the production frontend:

   `https://auth-frontend-self-pi.vercel.app`

10. Test the authentication interface and verify that it can communicate with the backend.

**Important:** Frontend environment variables are incorporated into the frontend build. If `VITE_API_URL` changes, rebuild and redeploy the frontend.

### 3.3 Redeployment order

When both applications require changes:

1. Deploy the backend.
2. Confirm that the backend health check succeeds.
3. Deploy the frontend.
4. Test the production authentication flow.
5. Check the browser console and hosting logs for errors.

Do not consider a deployment complete merely because the hosting platform reports a successful build.

---

## 4. Health Checks and Monitoring

The backend provides a health-check endpoint:

`GET /health`

### Healthy response

HTTP status: `200 OK`

```json
{
  "success": true,
  "status": "healthy",
  "database": "connected"
}
```

### Unhealthy response

When MongoDB is unavailable, the health endpoint should return HTTP `503 Service Unavailable`.

```json
{
  "success": false,
  "status": "unavailable",
  "database": "disconnected"
}
```

The health check considers both the application's database connection state and Mongoose's connection state.

### Monitoring procedure

1. Request `/health`.
2. Confirm the HTTP status.
3. Confirm the database status.
4. If the service is unhealthy, inspect the backend logs.
5. Check the MongoDB Atlas connection string, network access configuration, and database availability.
6. After correcting the issue, confirm that the health endpoint returns HTTP `200 OK`.

---

## 5. Database Connection Failure and Recovery

### 5.1 Startup failure

The backend attempts to establish a MongoDB connection before starting the HTTP server.

If the connection fails during startup, the application logs a fatal startup error and does not start the server as though the database were available.

The startup log includes information such as:

* Timestamp
* Log severity
* Error name
* Error message
* Stack trace for server-side diagnosis

Stack traces belong in server logs, not in responses sent to clients.

### 5.2 Database disconnection

The backend listens for MongoDB connection events.

It logs:

* `connected` when a connection is established
* `disconnected` when the connection is lost
* `reconnected` when a connection is restored
* `error` when a database connection error occurs

When the database is unavailable, the backend should not process normal API requests as though the database were healthy.

The health endpoint should report an unhealthy status, and normal API requests should receive a safe `503 Service Unavailable` response.

### 5.3 Recovery procedure

1. Check the backend logs for MongoDB connection errors.
2. Verify the `MONGO_URI_DIRECT` environment variable.
3. Check MongoDB Atlas availability and network access settings.
4. Correct the underlying connection problem.
5. Restart the backend if necessary.
6. Confirm that the logs report a successful database connection.
7. Request `/health`.
8. Verify that the response indicates a healthy service.

Do not report recovery as complete until the database connection and health check have been verified.

---

## 6. API Error Handling

API errors should follow a consistent JSON structure.

### Standard error response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "A safe, user-friendly explanation."
  }
}
```

### Example: Resource not found

HTTP status: `404 Not Found`

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested resource was not found."
  }
}
```

### Example: Service unavailable

HTTP status: `503 Service Unavailable`

```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "The service is temporarily unavailable. Please try again later."
  }
}
```

### Example: Validation failure

HTTP status: `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please provide a valid email"
  }
}
```

The validation message depends on the validation failure.

### Example: Unexpected server error

HTTP status: `500 Internal Server Error`

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred. Please try again later."
  }
}
```

### Error-handling requirements

* Use appropriate HTTP status codes.
* Return JSON error responses with a consistent structure.
* Provide safe messages to clients.
* Do not expose stack traces, internal file paths, database credentials, or other sensitive implementation details.
* Record unexpected errors in server logs.
* Do not send internal error details to the frontend.

---

## 7. Structured Logging

Backend logs use JSON-formatted entries.

A log entry can contain:

* `timestamp`
* `level`
* `message`
* Additional diagnostic details where appropriate

Example:

```json
{
  "timestamp": "2026-10-10T19:11:30.587Z",
  "level": "fatal",
  "message": "Server startup failed",
  "errorName": "MongooseServerSelectionError",
  "errorMessage": "Database connection failed"
}
```

The exact error message depends on the failure.

### Log severity

| Level   | Purpose                                                                               |
| ------- | ------------------------------------------------------------------------------------- |
| `info`  | Normal application events, such as successful database connections and server startup |
| `warn`  | Recoverable or potentially concerning events, such as a database disconnection        |
| `error` | Database errors and unexpected request failures                                       |
| `fatal` | Startup failures that prevent the application from starting                           |

### Logging rules

1. Include a timestamp and severity level.
2. Record useful diagnostic information.
3. Keep sensitive values, passwords, tokens, and connection-string credentials out of logs.
4. Do not return server stack traces to API clients.
5. Use Render's logs to investigate production failures.

---

## 8. Frontend Downtime and Request Handling

The frontend must communicate failures clearly rather than leaving users with a blank screen or an unexplained error.

### 8.1 API unavailable

When a request cannot reach the backend, the authentication forms display a message such as:

"We cannot reach the server right now. Please try again shortly."

Users should be able to understand that the service is temporarily unavailable and retry later.

### 8.2 Slow requests and timeouts

The authentication forms use an `AbortController` with a ten-second timeout.

If a request exceeds the timeout, the frontend displays a message explaining that the request timed out and suggesting that the user check their connection and try again.

The loading state is cleared when the request finishes or fails.

### 8.3 API errors

When the backend returns an unsuccessful HTTP status, the frontend attempts to display the error message returned by the API.

If the response does not contain a usable message, the frontend uses a safe fallback message.

### 8.4 Frontend verification

When testing the frontend, verify that:

1. Loading indicators appear while authentication requests are in progress.
2. The submit button cannot trigger duplicate submissions while loading.
3. Invalid form input produces visible validation messages.
4. Invalid credentials produce a useful error message.
5. An unavailable backend produces a clear message.
6. A slow request produces a timeout message.
7. Loading indicators disappear after a request fails.
8. Users can retry after the service becomes available.

---

## 9. Ordered Troubleshooting Checklist

Follow this checklist in order when the application fails.

### Step 1: Check the backend health endpoint

Request:

`https://auth-deployment-exercise.onrender.com/health`

* If the endpoint reports healthy, continue to Step 2.
* If it reports unavailable, continue to Step 3.
* If the endpoint cannot be reached, inspect the backend deployment status and logs.

### Step 2: Check the frontend configuration

Verify that the production frontend uses:

`VITE_API_URL=https://auth-deployment-exercise.onrender.com`

If the value was changed, rebuild and redeploy the frontend.

### Step 3: Inspect backend logs

Look for:

* MongoDB connection errors
* Startup failures
* Port or process errors
* Unexpected request failures

Use the timestamp and severity level to identify the relevant event.

### Step 4: Verify environment variables

Check that:

* `MONGO_URI_DIRECT` is present and valid.
* `JWT_SECRET` is configured.
* `JWT_EXPIRES_IN` is configured.
* `PORT` is supplied by the hosting platform.
* The frontend has the correct `VITE_API_URL`.

Do not print or share secret values when troubleshooting.

### Step 5: Verify MongoDB Atlas

Check that:

* The database is available.
* The connection string is correct.
* Network access rules permit the application's connection.
* Database credentials are valid.

Correct any configuration problem before restarting the backend.

### Step 6: Check CORS

Confirm that the backend allows the intended frontend origin.

Production frontend:

`https://auth-frontend-self-pi.vercel.app`

Local frontend:

`http://localhost:5173`

The browser's origin must match an origin allowed by the backend.

If the browser reports a CORS error, inspect the actual response headers before changing configuration.

### Step 7: Test API error responses

Request a nonexistent endpoint and confirm that the API returns a safe `404` JSON response.

Verify that internal stack traces are not exposed to the client.

### Step 8: Test the authentication flow

After the health check succeeds:

1. Open the frontend.
2. Test sign-in.
3. Test sign-up using appropriate test data.
4. Test invalid credentials.
5. Confirm that successful authentication behaves as expected.
6. Check the browser console for errors.

### Step 9: Redeploy if necessary

After correcting a code or configuration problem:

1. Commit and push the changes.
2. Redeploy the affected service.
3. Check the deployment logs.
4. Re-run the health check.
5. Test the frontend and API again.

### Step 10: Confirm recovery

The incident is resolved when:

* The backend starts successfully.
* MongoDB is connected.
* The health endpoint reports healthy.
* The frontend can reach the backend.
* Authentication requests behave as expected.
* No unresolved deployment or browser errors remain.

---

## 10. Deployment 3 Verification Record

The following behaviours have been tested during local development:

| Test                                  | Expected result                                                           | Status |
| ------------------------------------- | ------------------------------------------------------------------------- | ------ |
| Successful MongoDB connection         | Logs indicate the database is connected                                   | Passed |
| Failed database connection at startup | Failure is logged and the server does not start normally                  | Passed |
| Database recovery                     | The backend reconnects after restoring valid configuration and restarting | Passed |
| Health check                          | Returns HTTP `200 OK` when the database is connected                      | Passed |
| Health-check response body            | Reports `success: true`, `status: healthy`, and `database: connected`     | Passed |
| Missing API route                     | Returns HTTP `404` with a safe JSON error                                 | Passed |
| CORS for local frontend               | Allows `http://localhost:5173`                                            | Passed |
| Frontend when API is unavailable      | Displays a clear server-unavailable message                               | Passed |

### Remaining verification

Before treating the deployment as fully verified:

* Test the deployed backend health endpoint.
* Test authentication on the production frontend.
* Verify the deployed environment variables.
* Confirm that production logs do not contain exposed secrets.
* Verify database-disconnection handling while the server is already running.
* Verify that the frontend handles slow requests and errors across the relevant screens.

---

## 11. Security and Operational Notes

* Never commit `.env` files or secrets to GitHub.
* Never expose database credentials or JWT secrets in frontend code.
* Never return server stack traces to clients.
* Keep error responses consistent and user-friendly.
* Inspect deployment logs when diagnosing failures.
* Confirm database health before declaring recovery complete.
* Redeploy after changes to production environment variables when required by the hosting platform.
* Retest the application after every production deployment.
