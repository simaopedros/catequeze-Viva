import { type AuthUser } from "wasp/auth";
import { useQuery, getAuditLogs } from "wasp/client/operations";
import { useState } from "react";
import DefaultLayout from "../../layout/DefaultLayout";
import { ShieldCheck, FileText, Download } from 'lucide-react';

const AuditLogPage = ({ user }: { user: AuthUser }) => {
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>('');
  const pageSize = 50;

  const { data, isLoading } = useQuery(getAuditLogs, {
    skip: page * pageSize,
    take: pageSize,
    ...(actionFilter ? { action: actionFilter } : {}),
  });

  const totalPages = data?.total ? Math.ceil(data.total / pageSize) : 0;

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Auditoria</h1>
            <p className="text-muted-foreground text-sm mt-1">Registo de acções administrativas e compliance LGPD.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            className="h-9 rounded-sm border border-input bg-background px-3 text-sm"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
          >
            <option value="">Todas as acções</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="EXPORT">EXPORT</option>
            <option value="APPROVE">APPROVE</option>
            <option value="REJECT">REJECT</option>
          </select>
          {data?.total != null && (
            <span className="text-xs text-muted-foreground">{data.total} registo(s)</span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#071A2D] border-t-transparent" />
          </div>
        ) : (!data?.logs || data.logs.length === 0) ? (
          <div className="flex flex-col items-center justify-center rounded-sm border border-border/70 bg-white p-12 text-center">
            <ShieldCheck className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-semibold">Nenhum registo</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-1">
              As acções auditadas aparecerão aqui.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-sm border border-border/70 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Data</th>
                    <th className="text-left px-4 py-3 font-medium">Acção</th>
                    <th className="text-left px-4 py-3 font-medium">Entidade</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Operação</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Utilizador</th>
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map((log: any) => {
                    let operation = '';
                    try { operation = JSON.parse(log.metadata || '{}').operation || ''; } catch {}
                    return (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
 log.action === 'CREATE' ? 'bg-[#071A2D]/08 text-[#071A2D]' :
 log.action === 'UPDATE' ? 'bg-[#071A2D]/08 text-[#071A2D]' :
 log.action === 'DELETE' ? 'bg-destructive/10 text-destructive' :
 log.action === 'APPROVE' ? 'bg-[#071A2D]/08 text-[#071A2D]' :
 log.action === 'REJECT' ? 'bg-orange-100 text-orange-800' :
 'bg-muted text-muted-foreground'
 }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs">{log.entityType}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">
                          {operation || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground hidden lg:table-cell">
                          {log.user?.email || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="text-xs px-3 py-1.5 rounded-sm border border-border/70 bg-white hover:bg-muted disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-xs text-muted-foreground">
                  Pág. {page + 1} de {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="text-xs px-3 py-1.5 rounded-sm border border-border/70 bg-white hover:bg-muted disabled:opacity-50"
                >
                  Seguinte
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DefaultLayout>
  );
};

export default AuditLogPage;
