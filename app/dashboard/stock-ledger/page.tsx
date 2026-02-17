import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, isAdmin } from "@/lib/auth/role";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function StockLedgerPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole(supabase, user.id);
  if (!isAdmin(role)) {
    redirect("/dashboard");
  }

  const { data: stockLedger } = await supabase
    .from("stock_ledger")
    .select(
      "id, quantity_change, uom, notes, created_at, products ( sku, name ), users_profile!stock_ledger_created_by_fkey ( first_name, last_name, role )"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Stock Ledger</h2>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Changed By</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockLedger && stockLedger.length > 0 ? (
              stockLedger.map((row: any) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {new Date(row.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.products?.sku}
                  </TableCell>
                  <TableCell>{row.products?.name}</TableCell>
                  <TableCell>
                    {row.users_profile ? (
                      <div>
                        <p className="text-sm font-medium">
                          {row.users_profile.first_name} {row.users_profile.last_name}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {row.users_profile.role}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      Number(row.quantity_change) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {Number(row.quantity_change) > 0 ? "+" : ""}
                    {Number(row.quantity_change)} {row.uom}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                    {row.notes ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  No ledger entries found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
