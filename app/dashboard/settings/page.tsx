import { createServerClient } from "@/lib/supabase-server"
import { ProfileSettings } from "@/components/profile-settings"
import { PaymentMethodSettings } from "@/components/payment-method-settings"

export default async function SettingsPage() {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get user profile
  const { data: profile } = await supabase.from("users").select("*").eq("id", user?.id).single()

  // Get payment methods
  const { data: paymentMethods } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("user_id", user?.id)
    .order("is_default", { ascending: false })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <ProfileSettings profile={profile} />
        <PaymentMethodSettings paymentMethods={paymentMethods || []} />
      </div>
    </div>
  )
}
