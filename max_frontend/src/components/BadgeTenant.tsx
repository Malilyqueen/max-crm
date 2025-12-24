interface BadgeTenantProps {
  tenant: string;
  role: string;
  preview: boolean;
  useMocks: boolean;
}

export function BadgeTenant({ tenant, role, preview, useMocks }: BadgeTenantProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="badge-chip"> {tenant} • {role} • {preview ? 'preview' : 'live'} </span>
      {preview && <span className="badge-chip text-[.8rem]">Preview</span>}
      {useMocks && <span className="badge-chip text-[.8rem]">Mock data</span>}
    </div>
  );
}