import { createClient } from "@supabase/supabase-js";
import { Env, jsonResponse } from "../../lib/helpers";

const SUPER_ADMIN_EMAILS = [
  "clearfile360@gmail.com",
  "raj.oneplus6@gmail.com",
  "clearconcept360@gmail.com",
  "admin@nilam360.ai",
  "superadmin@nilam360.ai"
];

function isAuthorizedEmail(email?: string | null, role?: string | null): boolean {
  if (!email) return false;
  if (role === "superadmin" || role === "admin" || role === "district_admin" || role === "super_admin") return true;
  return SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === email.toLowerCase());
}

export const onRequestOptions = async () => {
  return jsonResponse({}, 200);
};

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  return handleAdminUsersRequest(context);
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  return handleAdminUsersRequest(context);
};

async function handleAdminUsersRequest(context: { request: Request; env: Env }) {
  try {
    const supabaseUrl =
      context.env?.VITE_SUPABASE_URL ||
      context.env?.SUPABASE_URL ||
      (typeof process !== "undefined" && (process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL)) ||
      "";

    const supabaseAnonKey =
      context.env?.VITE_SUPABASE_ANON_KEY ||
      context.env?.SUPABASE_ANON_KEY ||
      (typeof process !== "undefined" && (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY)) ||
      "";

    const serviceRoleKey =
      context.env?.SUPABASE_SERVICE_ROLE_KEY ||
      (typeof process !== "undefined" && process.env?.SUPABASE_SERVICE_ROLE_KEY) ||
      "";

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ error: "Server configuration missing: Supabase URL or Anon Key" }, 500);
    }

    // 1. Check Authorization Bearer Token
    const authHeader = context.request.headers.get("Authorization") || context.request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized: Missing authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token || token === "undefined" || token === "null") {
      return jsonResponse({ error: "Unauthorized: Invalid or empty token" }, 401);
    }

    // 2. Validate token with Supabase Client (Anon Key)
    const clientForAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await clientForAuth.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized: Invalid or expired authentication token" }, 401);
    }

    // 3. Verify user is Super Admin
    const userRole = user.role || user.app_metadata?.role || user.user_metadata?.role;
    if (!isAuthorizedEmail(user.email, userRole)) {
      return jsonResponse({ error: "Forbidden: Super Admin privileges required" }, 403);
    }

    // 4. Require SUPABASE_SERVICE_ROLE_KEY server-side
    if (!serviceRoleKey) {
      return jsonResponse({ error: "Server configuration missing: SUPABASE_SERVICE_ROLE_KEY is not set on the server" }, 500);
    }

    // 5. Initialize Supabase Admin Client using Service Role Key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 6. Paginate listUsers to fetch ALL Supabase Auth users
    let authUsers: any[] = [];
    let page = 1;
    const perPage = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      });

      if (listError) {
        console.error("Error listing auth users:", listError);
        return jsonResponse({ error: `Failed to list auth users: ${listError.message}` }, 500);
      }

      if (listData && listData.users && listData.users.length > 0) {
        authUsers = authUsers.concat(listData.users);
        if (listData.users.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    // 7. Fetch matching public.profiles data
    const profilesMap = new Map<string, any>();
    const profilesByEmailMap = new Map<string, any>();
    try {
      const { data: profiles, error: profError } = await supabaseAdmin.from("profiles").select("*");
      if (!profError && profiles) {
        profiles.forEach((p: any) => {
          const key = p.id || p.uid;
          if (key) profilesMap.set(key, p);
          if (p.email) profilesByEmailMap.set(String(p.email).toLowerCase(), p);
        });
      }
    } catch (e) {
      console.warn("Notice: Could not fetch profiles table in admin endpoint:", e);
    }

    // 8. Fetch case counts per user from property_cases if table exists
    const caseCountMap = new Map<string, number>();
    try {
      const { data: cases, error: casesError } = await supabaseAdmin.from("property_cases").select("user_id, id");
      if (!casesError && cases) {
        cases.forEach((c: any) => {
          if (c.user_id) {
            caseCountMap.set(c.user_id, (caseCountMap.get(c.user_id) || 0) + 1);
          }
        });
      }
    } catch (e) {
      console.warn("Notice: Could not fetch property_cases count in admin endpoint:", e);
    }

    // 9. Combine Auth Users + Profile Data + Case Count into Normalized Objects
    const normalizedUsers = authUsers.map((authUser) => {
      const profile = profilesMap.get(authUser.id) || profilesByEmailMap.get(String(authUser.email || "").toLowerCase()) || null;
      const caseCount = caseCountMap.get(authUser.id) || profile?.case_count || profile?.caseCount || 0;
      const metadata = authUser.user_metadata || {};
      const isSuper = isAuthorizedEmail(authUser.email, profile?.role || userRole);

      const displayName =
        profile?.display_name ||
        profile?.displayName ||
        metadata.full_name ||
        metadata.name ||
        metadata.displayName ||
        (authUser.email ? authUser.email.split("@")[0] : "User");

      const photoURL =
        profile?.photo_url ||
        profile?.photoURL ||
        metadata.avatar_url ||
        metadata.picture ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${authUser.id}&backgroundColor=6366f1`;

      return {
        uid: authUser.id,
        id: authUser.id,
        email: authUser.email || "",
        displayName,
        photoURL,
        plan: profile?.plan || (isSuper ? "enterprise" : "free"),
        status: profile?.status || (isSuper ? "vip" : "active"),
        role: isSuper ? "superadmin" : (profile?.role || "user"),
        customCaseLimit: profile?.custom_case_limit ?? profile?.customCaseLimit,
        adminNotes: profile?.admin_notes || profile?.adminNotes,
        createdAt: authUser.created_at || profile?.created_at || new Date().toISOString(),
        lastLoginAt: authUser.last_sign_in_at || authUser.created_at || new Date().toISOString(),
        emailConfirmed: Boolean(authUser.email_confirmed_at),
        phone: authUser.phone || "",
        caseCount,
        hasProfile: Boolean(profile),
        user_metadata: authUser.user_metadata || {},
        app_metadata: authUser.app_metadata || {}
      };
    });

    return jsonResponse({
      users: normalizedUsers,
      total: normalizedUsers.length
    }, 200);

  } catch (err: any) {
    console.error("Admin Users Endpoint Error:", err);
    return jsonResponse({ error: err.message || "Internal server error" }, 500);
  }
}
