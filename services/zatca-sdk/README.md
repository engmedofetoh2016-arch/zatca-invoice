# ZATCA SDK Sidecar (Java)

This folder runs the official ZATCA Compliance & Enablement Toolbox SDK
as a separate service. The app will call it if `ZATCA_SDK_URL` is set.

## Expected HTTP contract

`POST /validate`

- Request body: raw XML (string)
- Response: JSON
  - `{ "ok": true }` if validation passes
  - `{ "ok": false, "errors": ["..."] }` if validation fails

## How to wire it

1. Obtain the official ZATCA toolbox SDK JAR from the portal.
2. Build & run this service in Coolify.
3. Set `ZATCA_SDK_URL` in the app to point to this service.

## Environment variables

- `ZATCA_JAR_PATH` — absolute path to the SDK JAR inside the container.
- `ZATCA_VALIDATE_CMD` — shell command to run validation.
  - Use `{input}` placeholder for the input XML file path.
  - Example:
    - `java -jar /opt/zatca/zatca-sdk.jar validate {input}`

## Notes

This service bundles the SDK JAR from `services/zatca-envoice-sdk-203/Lib/Java`.

If you update the SDK version, also update:
- `services/zatca-sdk/Dockerfile` (COPY path + jar name)

When `ZATCA_SDK_URL` is not set, the app skips validation.
