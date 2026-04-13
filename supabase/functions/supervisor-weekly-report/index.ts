import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

    // Find supervisors
    const { data: supervisorRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'supervisor')

    if (!supervisorRoles?.length) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no_supervisors' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Find platform owners
    const { data: ownerRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'platform_owner')

    if (!ownerRoles?.length) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no_owners' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const reports: any[] = []

    for (const sup of supervisorRoles) {
      const supervisorId = sup.user_id

      // Get supervisor name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', supervisorId)
        .single()

      const supervisorName = profile?.full_name || 'المشرف'

      // Tickets closed this week by supervisor
      const { count: ticketsClosed } = await supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', supervisorId)
        .eq('action', 'close_ticket')
        .gte('created_at', weekAgo)

      // Reports resolved this week
      const { count: reportsResolved } = await supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', supervisorId)
        .in('action', ['resolve_report', 'dismiss_report', 'review_report'])
        .gte('created_at', weekAgo)

      // Listings reviewed
      const { count: listingsReviewed } = await supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', supervisorId)
        .in('action', ['approve_listing', 'reject_listing', 'update_listing_status'])
        .gte('created_at', weekAgo)

      // Messages sent
      const { count: messagesSent } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', supervisorId)
        .gte('created_at', weekAgo)

      // Average response time (from ticket creation to first reply)
      const { data: ticketReplies } = await supabase
        .from('audit_logs')
        .select('created_at, details')
        .eq('user_id', supervisorId)
        .eq('action', 'reply_ticket')
        .gte('created_at', weekAgo)

      let avgResponseHours = 0
      if (ticketReplies?.length) {
        // Approximate: count total actions / 7 days
        avgResponseHours = Math.round((7 * 24) / (ticketReplies.length || 1))
      }

      const reportBody = `تقرير أداء المشرف ${supervisorName} هذا الأسبوع:\n\nتذاكر أُغلقت: ${ticketsClosed || 0}\nبلاغات حُلّت: ${reportsResolved || 0}\nرسائل أُرسلت: ${messagesSent || 0}\nإعلانات راجعها: ${listingsReviewed || 0}\nمتوسط وقت الرد: ${avgResponseHours} ساعة`

      reports.push({ supervisorName, body: reportBody })

      // Send notification to all owners
      for (const owner of ownerRoles) {
        await supabase.from('notifications').insert({
          user_id: owner.user_id,
          title: `تقرير أداء المشرف — ${supervisorName}`,
          body: reportBody,
          type: 'system',
          reference_type: 'weekly_report',
        })
      }
    }

    return new Response(JSON.stringify({ success: true, reports: reports.length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('supervisor-weekly-report error:', e)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
