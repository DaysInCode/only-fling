export const config = {
  adminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL ?? "admin@example.com",
  storageConnectionString: process.env.AzureWebJobsStorage ?? "",
  uploadContainerName: process.env.UPLOAD_CONTAINER_NAME ?? "media",
  platformFeePercent: Number(process.env.DEFAULT_PLATFORM_FEE_PERCENT ?? "12"),
};

export function isLocalDevelopment() {
  return !process.env.WEBSITE_INSTANCE_ID;
}
