import { FormEvent, useMemo, useState } from "react";
import { Eye, EyeOff, QrCode, RotateCcw, ShieldAlert } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface CredentialsQrPayload {
  schema: "photo-export-admin";
  version: 1;
  googleClientId: string;
  googleClientSecret: string;
  googleRefreshToken: string;
  googleDriveFolderId: string;
  instagramAppId: string;
  instagramAppSecret: string;
  instagramAccountId: string;
  instagramAccessToken: string;
}

type CredentialFields = Omit<CredentialsQrPayload, "schema" | "version">;

type SecretFieldName =
  | "googleClientSecret"
  | "googleRefreshToken"
  | "instagramAppSecret"
  | "instagramAccessToken";

const INITIAL_FIELDS: CredentialFields = {
  googleClientId: "",
  googleClientSecret: "",
  googleRefreshToken: "",
  googleDriveFolderId: "",
  instagramAppId: "",
  instagramAppSecret: "",
  instagramAccountId: "",
  instagramAccessToken: "",
};

const REQUIRED_FIELDS: Array<keyof CredentialFields> = [
  "googleClientId",
  "googleClientSecret",
  "googleRefreshToken",
  "googleDriveFolderId",
  "instagramAppId",
  "instagramAppSecret",
  "instagramAccountId",
  "instagramAccessToken",
];

interface FieldDefinition {
  name: keyof CredentialFields;
  label: string;
  description?: string;
  secret?: boolean;
  autoComplete?: string;
}

const GOOGLE_FIELDS: FieldDefinition[] = [
  {
    name: "googleClientId",
    label: "Google OAuth Client ID",
    autoComplete: "off",
  },
  {
    name: "googleClientSecret",
    label: "Google OAuth Client Secret",
    secret: true,
    autoComplete: "new-password",
  },
  {
    name: "googleRefreshToken",
    label: "Google Refresh Token",
    secret: true,
    autoComplete: "new-password",
  },
  {
    name: "googleDriveFolderId",
    label: "Google Drive Folder ID",
    autoComplete: "off",
  },
];

const INSTAGRAM_FIELDS: FieldDefinition[] = [
  {
    name: "instagramAppId",
    label: "Instagram App ID",
    autoComplete: "off",
  },
  {
    name: "instagramAppSecret",
    label: "Instagram App Secret",
    secret: true,
    autoComplete: "new-password",
  },
  {
    name: "instagramAccountId",
    label: "Instagram Business Account ID",
    autoComplete: "off",
  },
  {
    name: "instagramAccessToken",
    label: "Instagram Long-Lived Access Token",
    secret: true,
    autoComplete: "new-password",
  },
];

function createPayload(fields: CredentialFields): CredentialsQrPayload {
  return {
    schema: "photo-export-admin",
    version: 1,
    googleClientId: fields.googleClientId.trim(),
    googleClientSecret: fields.googleClientSecret.trim(),
    googleRefreshToken: fields.googleRefreshToken.trim(),
    googleDriveFolderId: fields.googleDriveFolderId.trim(),
    instagramAppId: fields.instagramAppId.trim(),
    instagramAppSecret: fields.instagramAppSecret.trim(),
    instagramAccountId: fields.instagramAccountId.trim(),
    instagramAccessToken: fields.instagramAccessToken.trim(),
  };
}

function createCompactJson(payload: CredentialsQrPayload): string {
  return JSON.stringify(payload);
}

export function CredentialsQrGenerator() {
  const [fields, setFields] = useState<CredentialFields>(INITIAL_FIELDS);
  const [generatedPayload, setGeneratedPayload] =
    useState<CredentialsQrPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<
    Partial<Record<SecretFieldName, boolean>>
  >({});

  const qrJson = useMemo(() => {
    if (!generatedPayload) {
      return null;
    }

    return createCompactJson(generatedPayload);
  }, [generatedPayload]);

  function updateField(name: keyof CredentialFields, value: string) {
    setFields((current) => ({
      ...current,
      [name]: value,
    }));

    // Hide a previously generated QR as soon as any credential changes.
    // This prevents an outdated QR from remaining visible.
    setGeneratedPayload(null);
    setError(null);
  }

  function toggleSecretVisibility(name: SecretFieldName) {
    setVisibleSecrets((current) => ({
      ...current,
      [name]: !current[name],
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const missingFields = REQUIRED_FIELDS.filter(
      (name) => fields[name].trim().length === 0,
    );

    if (missingFields.length > 0) {
      setGeneratedPayload(null);
      setError("Complete every credential field before generating the QR code.");
      return;
    }

    setGeneratedPayload(createPayload(fields));
    setError(null);
  }

  function clearCredentials() {
    setFields(INITIAL_FIELDS);
    setGeneratedPayload(null);
    setVisibleSecrets({});
    setError(null);
  }

  function renderField(field: FieldDefinition) {
    const isSecret = field.secret === true;
    const secretName = isSecret ? (field.name as SecretFieldName) : null;
    const isVisible = secretName
      ? visibleSecrets[secretName] === true
      : false;

    return (
      <div key={field.name} className="space-y-2">
        <Label htmlFor={field.name}>{field.label}</Label>

        <div className="relative">
          <Input
            id={field.name}
            name={field.name}
            type={isSecret && !isVisible ? "password" : "text"}
            value={fields[field.name]}
            onChange={(event) => updateField(field.name, event.target.value)}
            autoComplete={field.autoComplete ?? "off"}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            className={isSecret ? "pr-11" : undefined}
          />

          {secretName && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full w-10"
              onClick={() => toggleSecretVisibility(secretName)}
              aria-label={
                isVisible
                  ? `Hide ${field.label}`
                  : `Show ${field.label}`
              }
            >
              {isVisible ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </Button>
          )}
        </div>

        {field.description && (
          <p className="text-xs text-muted-foreground">
            {field.description}
          </p>
        )}
      </div>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Photo Export credentials QR</CardTitle>
        <CardDescription>
          Enter the credentials, generate the QR code, and scan it from the
          Photo Export app.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Alert variant="destructive">
          <ShieldAlert className="size-4" />
          <AlertTitle>This QR code contains secrets</AlertTitle>
          <AlertDescription>
            Generate it only on a trusted device. Do not screenshot, print,
            upload, email, or share the QR code. Clear the form after scanning.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-4">
            <div>
              <h2 className="font-semibold">Google credentials</h2>
              <p className="text-sm text-muted-foreground">
                OAuth and Drive configuration used by Photo Export.
              </p>
            </div>

            <div className="grid gap-4">
              {GOOGLE_FIELDS.map(renderField)}
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <div>
              <h2 className="font-semibold">Instagram credentials</h2>
              <p className="text-sm text-muted-foreground">
                Meta application and business-account configuration.
              </p>
            </div>

            <div className="grid gap-4">
              {INSTAGRAM_FIELDS.map(renderField)}
            </div>
          </section>

          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" className="gap-2">
              <QrCode className="size-4" />
              Generate QR code
            </Button>

            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={clearCredentials}
            >
              <RotateCcw className="size-4" />
              Clear credentials
            </Button>
          </div>
        </form>

        {qrJson && (
          <>
            <Separator />

            <section
              className="space-y-4"
              aria-labelledby="generated-qr-heading"
            >
              <div>
                <h2 id="generated-qr-heading" className="font-semibold">
                  Scan this QR code
                </h2>
                <p className="text-sm text-muted-foreground">
                  Open the Photo Export admin menu and choose Scan Credentials
                  QR.
                </p>
              </div>

              <div className="flex justify-center rounded-xl border bg-white p-5">
                <QRCodeSVG
                  value={qrJson}
                  size={320}
                  level="M"
                  marginSize={4}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  title="Photo Export credentials QR code"
                />
              </div>

              <p className="text-center text-xs text-muted-foreground">
                No image download or export control is provided. Changing any
                field immediately removes the generated QR code.
              </p>
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}