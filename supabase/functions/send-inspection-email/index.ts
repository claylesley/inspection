import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      recipient_email,
      pdf_filename,
      house_num,
      room_num,
      tenant_name,
      inspector_name,
      date,
      grand_total,
      pdf_base64,
      supplies_mode,
    } = await req.json();

    // Subject and attachment filename always match the local file name
    const subject = pdf_filename ? pdf_filename.replace(/\.pdf$/i, "") : `Inspection — House ${house_num || ""} · Room ${room_num || ""}`;
    const attachmentFilename = pdf_filename || `Inspection_${house_num || ""}_Room${room_num || ""}.pdf`;

    const lines = supplies_mode
      ? [
          `The Groves — Supplies Needed`,
          ``,
          `House: ${house_num || "—"} | Room: ${room_num || "—"}`,
          `Tenant: ${tenant_name || "—"}`,
          `Inspector: ${inspector_name || "—"}`,
          `Date: ${date || "—"}`,
          ``,
          `Please see the attached PDF for the full supplies list for this unit.`,
        ]
      : [
          `The Groves — Move-Out Inspection Report`,
          ``,
          `House: ${house_num || "—"} | Room: ${room_num || "—"}`,
          `Tenant: ${tenant_name || "—"}`,
          `Inspector: ${inspector_name || "—"}`,
          `Date: ${date || "—"}`,
          ``,
          `Grand Total: $${Number(grand_total).toFixed(2)}`,
          ``,
          `Full inspection report is attached as a PDF.`,
        ];

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY secret not set");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [recipient_email],
        subject,
        text: lines.join("\n"),
        ...(pdf_base64 ? { attachments: [{ filename: attachmentFilename, content: pdf_base64 }] } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend API error: ${err}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Function failed:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
