"use client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useSession } from "next-auth/react"




export default function DashboardPage() {
  const {data: session} = useSession()

  return (
    <div className="flex min-h-screen">
      <div className="flex-1">
        {/* Main content */}
        <main className="flex-1">
          <div className="flex flex-col gap-8">
            <h1 className="text-3xl font-bold tracking-tight">Hello {session?.user?.name}!!</h1>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Results</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px]">
                  <p>Your recent results will appear here.</p>
                </CardContent>
              </Card>

              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Upcoming Quiz</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    No upcoming quizzes scheduled
                  </p>
                </CardContent>
              </Card>

              <Card className="col-span-full">
                <CardHeader>
                  <CardTitle>User Report</CardTitle>
                  <CardDescription>Performance Graph</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <p>Your performance graph will be displayed here.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

