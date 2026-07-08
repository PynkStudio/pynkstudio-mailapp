export type MailAppProps = {
  tenantId?: string;
  mode?: "platform" | "tenant";
};

export function MailApp(_props: MailAppProps): never {
  throw new Error(
    "@pynkstudio/mailapp/react is installed, but the React UI has not been extracted yet. Use the host app implementation until the UI migration is completed.",
  );
}
