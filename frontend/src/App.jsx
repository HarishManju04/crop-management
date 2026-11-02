import React, { useEffect, useState } from "react";
import SmartCropDashboard from "./SmartCropDashboard.jsx";

const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

async function api(path, options = {}) {
  const token = localStorage.getItem("smartCropToken");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  let data = {};
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data;
}

function Login({ mode, onSwitch, onSuccess }) {
  const admin = mode === "admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const data = await api("/login", { method: "POST", body: JSON.stringify({ email: email.trim(), password }) });
      if (data.role !== (admin ? "admin" : "user")) {
        throw new Error(admin ? "This account is not an administrator." : "Please use the Admin Login for an administrator account.");
      }
      localStorage.setItem("smartCropToken", data.access_token);
      localStorage.setItem("smartCropRole", data.role);
      localStorage.setItem("smartCropUser", JSON.stringify(data.user));
      onSuccess(data.role, data.user);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <div className="auth-page">
    <div className="auth-left">
      <div className="auth-brand">🌿 <span>Smart Crop<small>Management System</small></span></div>
      <div className="auth-copy">
        <div className="auth-icon">{admin ? "🛡️" : "🌱"}</div>
        <h1>{admin ? "Admin Control Center" : "Smart Farming Starts Here"}</h1>
        <p>{admin ? "Securely manage users, agricultural data, reports and system services." : "Access crop recommendations, weather, disease risk and farm insights."}</p>
        <div className="auth-features">{(admin ? ["User Management","Agricultural Data","Reports & Analytics","System Monitoring"] : ["Crop Recommendation","Weather Information","Yield Prediction","Disease Risk"]).map(x => <span key={x}>✓ {x}</span>)}</div>
      </div>
    </div>
    <div className="auth-right"><div className="auth-card">
      <div className="auth-circle">{admin ? "🛡️" : "👤"}</div>
      <h2>{admin ? "Admin Login" : "User Login"}</h2>
      <p className="auth-sub">{admin ? "Sign in to access the administration panel" : "Sign in to access your Smart Crop dashboard"}</p>
      <form onSubmit={submit}>
        <label>Email Address</label><input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder={admin ? "admin@smartcrop.com" : "farmer@smartcrop.com"} required />
        <label>Password</label><input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Enter your password" required />
        {error && <div className="auth-error">{error}</div>}
        <button disabled={busy} className="auth-button">{busy ? "Signing in..." : `Login as ${admin ? "Admin" : "User"} →`}</button>
      </form>
      {!admin && <p className="auth-switch">New farmer? <button onClick={onSwitch.create}>Create an Account</button></p>}
      <p className="auth-switch">{admin ? "Are you a farmer/user?" : "Are you an administrator?"} <button onClick={onSwitch.role}>{admin ? "User Login" : "Admin Login"}</button></p>
    </div></div>
  </div>;
}

function Register({ onBack, onCreated }) {
  const [form,setForm]=useState({name:"",email:"",password:"",confirm:""}); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  async function submit(e){ e.preventDefault(); setError(""); if(form.password.length<6) return setError("Password must contain at least 6 characters."); if(form.password!==form.confirm) return setError("Passwords do not match."); setBusy(true); try { await api("/register",{method:"POST",body:JSON.stringify({name:form.name.trim(),email:form.email.trim(),password:form.password})}); onCreated(form.email.trim()); } catch(err){setError(err.message)} finally{setBusy(false)} }
  return <div className="auth-page"><div className="auth-left"><div className="auth-brand">🌿 <span>Smart Crop<small>Management System</small></span></div><div className="auth-copy"><div className="auth-icon">🌱</div><h1>Create Your Account</h1><p>Register as a farmer and start using the Smart Crop management system.</p><div className="auth-features"><span>✓ Secure PostgreSQL account</span><span>✓ Weather & crop insights</span><span>✓ Farm recommendations</span><span>✓ Protected login</span></div></div></div><div className="auth-right"><div className="auth-card"><div className="auth-circle">🌱</div><h2>Create an Account</h2><p className="auth-sub">Create a farmer account to continue</p><form onSubmit={submit}><label>Full Name</label><input value={form.name} onChange={e=>set("name",e.target.value)} required /><label>Email Address</label><input type="email" value={form.email} onChange={e=>set("email",e.target.value)} required /><label>Password</label><input type="password" value={form.password} onChange={e=>set("password",e.target.value)} minLength="6" required /><label>Confirm Password</label><input type="password" value={form.confirm} onChange={e=>set("confirm",e.target.value)} required />{error&&<div className="auth-error">{error}</div>}<button disabled={busy} className="auth-button">{busy?"Creating account...":"Create Account →"}</button></form><p className="auth-switch"><button onClick={onBack}>← Back to User Login</button></p></div></div></div>
}

function AdminDashboard({ user, logout }) {
 const [users,setUsers]=useState([]);
 const [updates,setUpdates]=useState([]);
 const [updatesError,setUpdatesError]=useState("");
 const [updateForm,setUpdateForm]=useState({title:"",body:"",category:"General",is_published:true});
 const [editingUpdate,setEditingUpdate]=useState(null);
 const [savingUpdate,setSavingUpdate]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [showPassword,setShowPassword]=useState(false);
 const [passwords,setPasswords]=useState({current:"",newPassword:"",confirm:""});
 const [changing,setChanging]=useState(false);
 const [active,setActive]=useState("Overview");

 async function loadUsers(){
   try {
     const d=await api("/admin/users");
     setUsers(d.users);
     setError("");
   } catch(e) { setError(e.message); }
 }

 async function loadUpdates(){
   try {
     const d=await api("/admin/updates");
     setUpdates(d.updates);
     setUpdatesError("");
   } catch(e) { setUpdatesError(e.message); }
 }

 useEffect(()=>{loadUsers();loadUpdates()},[]);

 function startEditingUpdate(item){
   setEditingUpdate(item.id);
   setUpdateForm({
     title:item.title,
     body:item.body,
     category:item.category,
     is_published:item.is_published
   });
   setError("");
   setMessage("");
 }

 function resetUpdateForm(){
   setEditingUpdate(null);
   setUpdateForm({title:"",body:"",category:"General",is_published:true});
 }

 async function saveUpdate(e){
   e.preventDefault();
   setError("");
   setMessage("");
   setSavingUpdate(true);
   try {
     await api(editingUpdate ? `/admin/updates/${editingUpdate}` : "/admin/updates",{
       method:editingUpdate ? "PUT" : "POST",
       body:JSON.stringify({
         ...updateForm,
         title:updateForm.title.trim(),
         body:updateForm.body.trim(),
         category:updateForm.category.trim()
       })
     });
     resetUpdateForm();
     setMessage(editingUpdate ? "Update saved successfully." : "Update created successfully.");
     await loadUpdates();
   } catch(e) {
     setError(e.message);
   } finally {
     setSavingUpdate(false);
   }
 }

 async function removeUpdate(item){
   if(!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
   setError("");
   setMessage("");
   try {
     await api(`/admin/updates/${item.id}`,{method:"DELETE"});
     if(editingUpdate===item.id) resetUpdateForm();
     setMessage("Update deleted successfully.");
     await loadUpdates();
   } catch(e) {
     setError(e.message);
   }
 }

 async function changePassword(e){
   e.preventDefault();
   setError(""); setMessage("");
   if(passwords.newPassword.length<6) return setError("New password must contain at least 6 characters.");
   if(passwords.newPassword!==passwords.confirm) return setError("New passwords do not match.");
   setChanging(true);
   try {
     await api("/change-password",{
       method:"POST",
       body:JSON.stringify({
         current_password:passwords.current,
         new_password:passwords.newPassword
       })
     });
     setMessage("Password changed successfully. You will be logged out.");
     setPasswords({current:"",newPassword:"",confirm:""});
     setTimeout(logout,1200);
   } catch(e) {
     setError(e.message);
   } finally {
     setChanging(false);
   }
 }

 const admins=users.filter(u=>u.role==="admin");
 const farmers=users.filter(u=>u.role==="user");

 return <div className="admin-shell">
   <aside className="admin-sidebar">
     <div className="admin-logo"><span>🌿</span><div><b>Smart Crop</b><small>ADMIN CENTER</small></div></div>
     <div className="admin-nav-title">CONTROL PANEL</div>
     {["Overview","Users","Updates","Security"].map(item =>
       <button key={item} className={`admin-nav-item ${active===item?"active":""}`} onClick={()=>setActive(item)}>
         <span>{item==="Overview"?"▦":item==="Users"?"♙":item==="Updates"?"✎":"◈"}</span>{item}
       </button>
     )}
     <div className="admin-sidebar-bottom">
       <div className="admin-mini-profile"><span>🛡️</span><div><b>{user?.name || "System Admin"}</b><small>Administrator</small></div></div>
       <button className="admin-logout" onClick={logout}>↪ Logout</button>
     </div>
   </aside>

   <main className="admin-workspace">
     <header className="admin-header">
       <div><div className="admin-breadcrumb">Administration / {active}</div><h1>{active}</h1><p>Smart Crop Management System</p></div>
       <div className="admin-header-user"><span className="admin-status-dot"></span><span>{user?.email}</span><button onClick={logout}>Logout</button></div>
     </header>

     {error && <div className="admin-alert error">{error}</div>}
     {message && <div className="admin-alert success">{message}</div>}

     {active==="Overview" && <>
       <div className="admin-stat-grid">
         <div className="admin-stat"><span className="stat-icon">👥</span><div><small>Total Users</small><strong>{users.length}</strong><em>Registered accounts</em></div></div>
         <div className="admin-stat"><span className="stat-icon">🛡️</span><div><small>Administrators</small><strong>{admins.length}</strong><em>Protected accounts</em></div></div>
         <div className="admin-stat"><span className="stat-icon">🌱</span><div><small>Farmers</small><strong>{farmers.length}</strong><em>User accounts</em></div></div>
         <div className="admin-stat"><span className="stat-icon">●</span><div><small>System Status</small><strong className="online-text">Online</strong><em>API connected</em></div></div>
       </div>
       <section className="admin-card">
         <div className="admin-card-title"><div><h2>Welcome, {user?.name || "Administrator"} 👋</h2><p>Use the control panel to manage registered users, farmer updates, and administrator security.</p></div><span className="admin-badge">ADMIN ACCESS</span></div>
         <div className="admin-quick-grid">
           <button onClick={()=>setActive("Users")}><span>👥</span><b>Manage Users</b><small>View registered farmers and admins</small></button>
           <button onClick={()=>setActive("Updates")}><span>📢</span><b>Manage Updates</b><small>Create dashboard updates for farmers</small></button>
           <button onClick={()=>setActive("Security")}><span>🔐</span><b>Account Security</b><small>Change the administrator password</small></button>
         </div>
       </section>
       <section className="admin-card">
         <div className="admin-card-title"><div><h2>Recent Accounts</h2><p>Latest accounts available in the database.</p></div></div>
         <UserTable users={users.slice(-5).reverse()} />
       </section>
     </>}

     {active==="Users" && <section className="admin-card">
       <div className="admin-card-title"><div><h2>Registered Users</h2><p>All Smart Crop accounts stored in PostgreSQL.</p></div><span className="admin-count">{users.length} accounts</span></div>
       <UserTable users={users} />
     </section>}

     {active==="Updates" && <>
       {updatesError && <div className="admin-alert error">{updatesError}</div>}
       <section className="admin-card">
         <div className="admin-card-title"><div><h2>{editingUpdate ? "Edit Update" : "Create an Update"}</h2><p>Published updates are shown to signed-in farmers on their dashboard.</p></div><span className="admin-count">{updates.length} updates</span></div>
         <form className="admin-update-form" onSubmit={saveUpdate}>
           <label htmlFor="update-title">Title</label>
           <input id="update-title" value={updateForm.title} onChange={e=>setUpdateForm(f=>({...f,title:e.target.value}))} maxLength="150" minLength="3" required />
           <label htmlFor="update-category">Category</label>
           <input id="update-category" value={updateForm.category} onChange={e=>setUpdateForm(f=>({...f,category:e.target.value}))} maxLength="50" required />
           <label htmlFor="update-body">Content</label>
           <textarea id="update-body" value={updateForm.body} onChange={e=>setUpdateForm(f=>({...f,body:e.target.value}))} maxLength="5000" rows="5" required />
           <label className="admin-publish-option"><input type="checkbox" checked={updateForm.is_published} onChange={e=>setUpdateForm(f=>({...f,is_published:e.target.checked}))} /> Publish to user dashboard</label>
           <div className="admin-update-form-actions">
             <button className="auth-button" disabled={savingUpdate}>{savingUpdate ? "Saving..." : editingUpdate ? "Save Changes" : "Create Update"}</button>
             {editingUpdate && <button type="button" className="security-toggle" onClick={resetUpdateForm}>Cancel</button>}
           </div>
         </form>
       </section>
       <section className="admin-card">
         <div className="admin-card-title"><div><h2>All Updates</h2><p>Drafts are only visible here until published.</p></div></div>
         <div className="admin-table-wrap"><table className="admin-updates-table"><thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Last Updated</th><th>Actions</th></tr></thead>
           <tbody>{updates.map(item=><tr key={item.id}>
             <td><b>{item.title}</b><small className="admin-update-preview">{item.body}</small></td>
             <td>{item.category}</td>
             <td><span className={`update-status ${item.is_published?"published":"draft"}`}>{item.is_published?"Published":"Draft"}</span></td>
             <td>{item.updated_at ? new Date(item.updated_at).toLocaleString() : "—"}</td>
             <td className="admin-update-actions"><button type="button" onClick={()=>startEditingUpdate(item)}>Edit</button><button type="button" className="delete" onClick={()=>removeUpdate(item)}>Delete</button></td>
           </tr>)}
           {!updates.length && <tr><td colSpan="5">No updates have been created yet.</td></tr>}</tbody>
         </table></div>
       </section>
     </>}

     {active==="Security" && <section className="admin-card security-card">
       <div className="admin-card-title"><div><h2>Administrator Security</h2><p>Your password is stored as a secure bcrypt hash in the database.</p></div><span className="security-badge">🔒 SECURE</span></div>
       <div className="admin-credential-box">
         <div><small>ADMIN ID</small><b>{user?.email || "admin@smartcrop.com"}</b></div>
         <div><small>ROLE</small><b>Administrator</b></div>
       </div>
       <button className="security-toggle" onClick={()=>{setShowPassword(v=>!v);setError("");setMessage("");}}>
         {showPassword ? "Close password form" : "Change administrator password"}
       </button>
       {showPassword && <form className="admin-password-form" onSubmit={changePassword}>
         <label>Current Password</label><input type="password" value={passwords.current} onChange={e=>setPasswords(p=>({...p,current:e.target.value}))} required />
         <label>New Password</label><input type="password" value={passwords.newPassword} onChange={e=>setPasswords(p=>({...p,newPassword:e.target.value}))} minLength="6" required />
         <label>Confirm New Password</label><input type="password" value={passwords.confirm} onChange={e=>setPasswords(p=>({...p,confirm:e.target.value}))} minLength="6" required />
         <button disabled={changing} className="auth-button">{changing ? "Saving..." : "Save New Password"}</button>
       </form>}
       <div className="security-note">For safety, the administrator password is never returned by the API or displayed in the dashboard. Only the configured initial credentials should be shared with the administrator.</div>
     </section>}
   </main>
 </div>;
}

function UserTable({users}) {
 return <div className="admin-table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Email / Admin ID</th><th>Role</th><th>Created</th></tr></thead>
 <tbody>{users.map(u=><tr key={u.id}><td>#{u.id}</td><td><b>{u.name}</b></td><td>{u.email}</td><td><span className={`role-pill ${u.role}`}>{u.role}</span></td><td>{u.created_at ? new Date(u.created_at).toLocaleString() : "—"}</td></tr>)}</tbody></table></div>
}

export default function App(){
 const [screen,setScreen]=useState(()=>localStorage.getItem("smartCropRole")||"user-login"); const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem("smartCropUser")||"null")}catch{return null}});
 const logout=()=>{localStorage.removeItem("smartCropToken");localStorage.removeItem("smartCropRole");localStorage.removeItem("smartCropUser");setUser(null);setScreen("user-login")};
 useEffect(()=>{ if(!localStorage.getItem("smartCropToken") && (screen==="user"||screen==="admin")) setScreen("user-login"); },[]);
 if(screen==="admin") return <AdminDashboard user={user} logout={logout}/>;
 if(screen==="user") return <SmartCropDashboard user={user} onLogout={logout}/>;
 if(screen==="register") return <Register onBack={()=>setScreen("user-login")} onCreated={(email)=>{setScreen("user-login");alert(`Account created successfully for ${email}. Please log in.`)}}/>;
 return <Login mode={screen==="admin-login"?"admin":"user"} onSwitch={{role:()=>setScreen(screen==="admin-login"?"user-login":"admin-login"),create:()=>setScreen("register")}} onSuccess={(role,u)=>{setUser(u);setScreen(role)}}/>;
}
