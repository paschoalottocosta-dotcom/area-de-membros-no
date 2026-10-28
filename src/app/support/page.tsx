export const dynamic = "force-dynamic";

import { Mail } from "lucide-react";
import { redirect } from "next/navigation";

import { getBrand } from "@/lib/brand";
import { createClient } from "@/lib/supabase/server";

export default async function SupportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { supportEmail } = await getBrand();

  return (
    <main className="profile-page">
      <div className="profile-wrap">
        <div className="panel support-card">
          <p>Qualquer dúvida, entre em contato com o nosso suporte no e-mail abaixo:</p>
          <a href={`mailto:${supportEmail}`} className="support-card__email">
            <Mail size={16} />
            {supportEmail}
          </a>
          <p className="muted support-card__note">Respondemos em até 2 dias úteis.</p>
        </div>
      </div>
    </main>
  );
}
