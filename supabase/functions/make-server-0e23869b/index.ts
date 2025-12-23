import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.ts";
import { createClient } from "npm:@supabase/supabase-js";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Bucket name for employee documents
const BUCKET_NAME = 'make-0e23869b-employee-docs';

// Initialize storage bucket on startup
async function initStorage() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);

  if (!bucketExists) {
    console.log('Creating storage bucket:', BUCKET_NAME);
    await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 10485760 // 10MB
    });
  }
}

// Initialize storage on server start
initStorage().catch(console.error);

// Helper to verify admin auth
async function verifyAdmin(authHeader: string | undefined) {
  if (!authHeader) return null;

  const accessToken = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return null;
  }

  return user;
}

// Health check endpoint
app.get("/make-server-0e23869b/health", (c) => {
  return c.json({ status: "ok" });
});

// Admin signup (for initial admin creation)
app.post("/make-server-0e23869b/admin/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role: 'admin' },
      // Automatically confirm the user's email since an email server hasn't been configured
      email_confirm: true
    });

    if (error) {
      console.error('Admin signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ user: data.user }, 201);
  } catch (error) {
    console.error('Admin signup exception:', error);
    return c.json({ error: 'Admin signup failed' }, 500);
  }
});

// Admin login (handled by Supabase client-side, this is just for reference)
// The frontend will use supabase.auth.signInWithPassword()

// Submit employee onboarding form
app.post("/make-server-0e23869b/employees", async (c) => {
  try {
    const formData = await c.req.formData();

    // Generate unique employee ID
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const employeeId = `EMP-${randomSuffix}-${timestamp}`;

    // Parse education and work experience
    const education = JSON.parse(formData.get('education') as string || '[]');
    const workExperience = JSON.parse(formData.get('workExperience') as string || '[]');

    // Extract form fields
    const employee = {
      id: employeeId,
      personalIdentity: {
        fullName: formData.get('fullName'),
        dateOfBirth: formData.get('dateOfBirth'),
        gender: formData.get('gender'),
        bloodGroup: formData.get('bloodGroup'),
        nationality: formData.get('nationality'),
        personalEmail: formData.get('personalEmail'),
        mobileNumber: formData.get('mobileNumber'),
      },
      address: {
        currentAddress: formData.get('currentAddress'),
        city: formData.get('city'),
        district: formData.get('district'),
        state: formData.get('state'),
        pincode: formData.get('pincode'),
        permanentAddress: formData.get('permanentAddress'),
      },
      governmentTax: {
        aadhaarNumber: formData.get('aadhaarNumber'),
        panNumber: formData.get('panNumber'),
        passportNumber: formData.get('passportNumber') || null,
        passportExpiry: formData.get('passportExpiry') || null,
      },
      bankDetails: {
        accountHolderName: formData.get('accountHolderName'),
        bankName: formData.get('bankName'),
        accountNumber: formData.get('accountNumber'),
        ifscCode: formData.get('ifscCode'),
      },
      education: education,
      workExperience: {
        isFresher: formData.get('isFresher') === 'true',
        entries: workExperience,
      },
      emergencyContact: {
        name: formData.get('emergencyContactName'),
        relationship: formData.get('emergencyRelationship'),
        phone: formData.get('emergencyPhone'),
      },
      declarations: {
        digitalSignature: formData.get('digitalSignature'),
        submittedAt: new Date().toISOString(),
      },
      // Admin fields
      employeeId,
      status: 'pending',
      idCardPrepared: false,
      submittedAt: new Date().toISOString(),
    };

    // Handle file uploads
    const photograph = formData.get('photograph') as File | null;

    const fileUrls: any = {};

    // Upload photograph
    if (photograph) {
      const photoPath = `${employeeId}/photograph-${Date.now()}.${photograph.name.split('.').pop()}`;
      const photoBuffer = await photograph.arrayBuffer();

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(photoPath, photoBuffer, {
          contentType: photograph.type,
          upsert: false
        });

      if (!error) {
        fileUrls.photograph = photoPath;
      }
    }

    // Upload education certificates
    const educationCertPaths: string[] = [];
    for (let i = 0; i < education.length; i++) {
      const cert = formData.get(`educationCertificate_${i}`) as File | null;
      if (cert) {
        const certPath = `${employeeId}/education-cert-${i}-${Date.now()}.${cert.name.split('.').pop()}`;
        const certBuffer = await cert.arrayBuffer();

        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(certPath, certBuffer, {
            contentType: cert.type,
            upsert: false
          });

        if (!error) {
          educationCertPaths.push(certPath);
        }
      } else {
        educationCertPaths.push('');
      }
    }
    fileUrls.educationCertificates = educationCertPaths;

    // Upload experience letters
    const experienceLetterPaths: string[] = [];
    const relievingLetterPaths: string[] = [];

    for (let i = 0; i < workExperience.length; i++) {
      const expLetter = formData.get(`experienceLetter_${i}`) as File | null;
      const relLetter = formData.get(`relievingLetter_${i}`) as File | null;

      if (expLetter) {
        const letterPath = `${employeeId}/exp-letter-${i}-${Date.now()}.${expLetter.name.split('.').pop()}`;
        const letterBuffer = await expLetter.arrayBuffer();

        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(letterPath, letterBuffer, {
            contentType: expLetter.type,
            upsert: false
          });

        if (!error) {
          experienceLetterPaths.push(letterPath);
        } else {
          experienceLetterPaths.push('');
        }
      } else {
        experienceLetterPaths.push('');
      }

      if (relLetter) {
        const relPath = `${employeeId}/rel-letter-${i}-${Date.now()}.${relLetter.name.split('.').pop()}`;
        const relBuffer = await relLetter.arrayBuffer();

        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(relPath, relBuffer, {
            contentType: relLetter.type,
            upsert: false
          });

        if (!error) {
          relievingLetterPaths.push(relPath);
        } else {
          relievingLetterPaths.push('');
        }
      } else {
        relievingLetterPaths.push('');
      }
    }

    fileUrls.experienceLetters = experienceLetterPaths;
    fileUrls.relievingLetters = relievingLetterPaths;

    // Store employee data with file paths
    const employeeWithFiles = {
      ...employee,
      files: fileUrls,
    };

    await kv.set(`employee:${employeeId}`, employeeWithFiles);

    // Also add to employee list
    const employeeListKey = 'employees:list';
    const existingList = await kv.get(employeeListKey) || [];
    await kv.set(employeeListKey, [...existingList, employeeId]);

    return c.json({
      success: true,
      employeeId,
      message: 'Employee onboarding completed successfully'
    }, 201);

  } catch (error) {
    console.error('Employee submission error:', error);
    return c.json({ error: 'Failed to submit employee data' }, 500);
  }
});

// Get all employees (admin only)
app.get("/make-server-0e23869b/employees", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyAdmin(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const employeeIds = await kv.get('employees:list') || [];
    const employees = [];

    for (const id of employeeIds) {
      const employee = await kv.get(`employee:${id}`);
      if (employee) {
        // Generate signed URLs for files
        if (employee.files) {
          const signedUrls: any = {};

          if (employee.files.photograph) {
            const { data } = await supabase.storage
              .from(BUCKET_NAME)
              .createSignedUrl(employee.files.photograph, 3600); // 1 hour expiry
            signedUrls.photograph = data?.signedUrl || null;
          }

          if (employee.files.educationCertificates) {
            const certUrls: string[] = [];
            for (const certPath of employee.files.educationCertificates) {
              if (certPath) {
                const { data } = await supabase.storage
                  .from(BUCKET_NAME)
                  .createSignedUrl(certPath, 3600);
                certUrls.push(data?.signedUrl || '');
              } else {
                certUrls.push('');
              }
            }
            signedUrls.educationCertificates = certUrls;
          }

          employee.signedUrls = signedUrls;
        }

        employees.push(employee);
      }
    }

    return c.json({ employees });

  } catch (error) {
    console.error('Get employees error:', error);
    return c.json({ error: 'Failed to fetch employees' }, 500);
  }
});

// Get single employee (admin only)
app.get("/make-server-0e23869b/employees/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyAdmin(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const employeeId = c.req.param('id');
    const employee = await kv.get(`employee:${employeeId}`);

    if (!employee) {
      return c.json({ error: 'Employee not found' }, 404);
    }

    // Generate signed URLs for files
    if (employee.files) {
      const signedUrls: any = {};

      if (employee.files.photograph) {
        const { data } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(employee.files.photograph, 3600);
        signedUrls.photograph = data?.signedUrl || null;
      }

      if (employee.files.educationCertificates) {
        const certUrls: string[] = [];
        for (const certPath of employee.files.educationCertificates) {
          if (certPath) {
            const { data } = await supabase.storage
              .from(BUCKET_NAME)
              .createSignedUrl(certPath, 3600);
            certUrls.push(data?.signedUrl || '');
          } else {
            certUrls.push('');
          }
        }
        signedUrls.educationCertificates = certUrls;
      }

      employee.signedUrls = signedUrls;
    }

    return c.json({ employee });

  } catch (error) {
    console.error('Get employee error:', error);
    return c.json({ error: 'Failed to fetch employee' }, 500);
  }
});

// Update employee status (admin only)
app.patch("/make-server-0e23869b/employees/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyAdmin(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const employeeId = c.req.param('id');
    const updates = await c.req.json();

    const employee = await kv.get(`employee:${employeeId}`);

    if (!employee) {
      return c.json({ error: 'Employee not found' }, 404);
    }

    const updatedEmployee = {
      ...employee,
      ...updates,
    };

    await kv.set(`employee:${employeeId}`, updatedEmployee);

    return c.json({ employee: updatedEmployee });

  } catch (error) {
    console.error('Update employee error:', error);
    return c.json({ error: 'Failed to update employee' }, 500);
  }
});

// Delete employee (admin only)
app.delete("/make-server-0e23869b/employees/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyAdmin(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const employeeId = c.req.param('id');
    const employee = await kv.get(`employee:${employeeId}`);

    if (!employee) {
      return c.json({ error: 'Employee not found' }, 404);
    }

    // Remove from employee list
    const employeeListKey = 'employees:list';
    const existingList = await kv.get(employeeListKey) || [];
    const updatedList = existingList.filter((id) => id !== employeeId);
    await kv.set(employeeListKey, updatedList);

    // Remove employee data
    // kv_store doesn't have a direct delete, but setting to null or removing from list effectively hides it.
    // However, looking at kv_store.ts (if I could see it), it might have a delete.
    // Assuming we can just overwrite or ignore for now since list is source of truth.
    // But better to check kv_store.ts. I'll stick to list removal which effectively deletes it from the app.
    // Actually, I should check if kv_store has delete.
    // Wait, I saw kv_store earlier. It has `del`.
    await kv.del(`employee:${employeeId}`);

    return c.json({ success: true, message: 'Employee deleted successfully' });

  } catch (error) {
    console.error('Delete employee error:', error);
    return c.json({ error: 'Failed to delete employee' }, 500);
  }
});

// Mark ID card as prepared (admin only)
app.post("/make-server-0e23869b/employees/:id/id-card-prepared", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyAdmin(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const employeeId = c.req.param('id');
    const employee = await kv.get(`employee:${employeeId}`);

    if (!employee) {
      return c.json({ error: 'Employee not found' }, 404);
    }

    const updatedEmployee = {
      ...employee,
      idCardPrepared: true,
      status: 'active',
    };

    await kv.set(`employee:${employeeId}`, updatedEmployee);

    return c.json({ employee: updatedEmployee });

  } catch (error) {
    console.error('Mark ID card prepared error:', error);
    return c.json({ error: 'Failed to mark ID card as prepared' }, 500);
  }
});

// Get dashboard stats (admin only)
app.get("/make-server-0e23869b/dashboard/stats", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyAdmin(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const employeeIds = await kv.get('employees:list') || [];
    const employees = [];

    for (const id of employeeIds) {
      const employee = await kv.get(`employee:${id}`);
      if (employee) {
        employees.push(employee);
      }
    }

    const totalEmployees = employees.length;

    // Count new submissions today
    const today = new Date().toISOString().split('T')[0];
    const newToday = employees.filter(emp =>
      emp.submittedAt && emp.submittedAt.startsWith(today)
    ).length;

    // Count pending ID cards
    const pendingIdCards = employees.filter(emp => !emp.idCardPrepared).length;

    // Recent employees (last 5)
    const recentEmployees = employees
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 5);

    return c.json({
      totalEmployees,
      newToday,
      pendingIdCards,
      recentEmployees,
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return c.json({ error: 'Failed to fetch dashboard stats' }, 500);
  }
});

Deno.serve(app.fetch);