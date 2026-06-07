import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton"

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) redirect("/dashboard")

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: "#E8FF4A" }}>
            ตัวตึง - Just Run!
          </h1>
          <p className="text-xl text-muted-foreground">Just Run! 🏃</p>
          <p className="text-sm text-muted-foreground">
            วางแผนซ้อมวิ่งด้วยหลักวิทยาศาสตร์การกีฬา
          </p>
        </div>
        <GoogleSignInButton />
      </div>
    </div>
  )
}
