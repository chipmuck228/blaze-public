export default function AdminDashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to the admin panel. Manage your application from here.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Total Users</h3>
          <p className="text-2xl font-bold mt-2">-</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Verified Users</h3>
          <p className="text-2xl font-bold mt-2">-</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Admins</h3>
          <p className="text-2xl font-bold mt-2">-</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">New Today</h3>
          <p className="text-2xl font-bold mt-2">-</p>
        </div>
      </div>
    </div>
  )
}

