'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { ApiError } from '@/lib/api/fetcher';
import { userApi, type EmergencyContact, type EmergencyContactPayload } from '@/lib/api/user.api';
import { useAuthStore } from '@/store/auth.store';

type ModalMode = 'add' | 'edit' | null;

interface ContactFormState {
  name: string;
  relationship: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

interface ContactFormErrors {
  name?: string;
  relationship?: string;
  phone?: string;
  email?: string;
}

const RELATIONSHIP_OPTIONS = ['Mother', 'Father', 'Sibling', 'Spouse', 'Friend', 'Doctor', 'Other'] as const;

function emptyForm(): ContactFormState {
  return {
    name: '',
    relationship: 'Mother',
    phone: '',
    email: '',
    isPrimary: false,
  };
}

function validateContact(form: ContactFormState): ContactFormErrors {
  const errors: ContactFormErrors = {};

  if (!form.name.trim()) errors.name = 'Name is required';
  if (!form.relationship.trim()) errors.relationship = 'Relationship is required';
  if (!/^\+?[1-9]\d{9,14}$/.test(form.phone.trim())) errors.phone = 'Enter a valid phone number';
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address';

  return errors;
}

export default function EmergencyContactsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [maxContacts, setMaxContacts] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmergencyContact | null>(null);
  const [form, setForm] = useState<ContactFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<ContactFormErrors>({});

  const contactCount = contacts.length;
  const disableAdd = contactCount >= maxContacts;
  const sortedContacts = useMemo(
    () => [...contacts].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)),
    [contacts]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    void loadContacts();
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function loadContacts() {
    setLoading(true);
    setError('');
    try {
      const response = await userApi.getEmergencyContacts();
      if (response.success && response.data) {
        setContacts(response.data.contacts);
        setMaxContacts(response.data.maxContacts);
      }
    } catch (err) {
      setError(parseApiError(err, 'Unable to load emergency contacts right now.'));
    } finally {
      setLoading(false);
    }
  }

  function parseApiError(err: unknown, fallback: string) {
    if (err instanceof ApiError) return err.message || fallback;
    if (err instanceof Error && err.message) return err.message;
    return fallback;
  }

  function openAddModal() {
    setEditingContact(null);
    setForm(emptyForm());
    setFormErrors({});
    setError('');
    setModalMode('add');
  }

  function openEditModal(contact: EmergencyContact) {
    setEditingContact(contact);
    setForm({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      email: contact.email ?? '',
      isPrimary: contact.isPrimary,
    });
    setFormErrors({});
    setError('');
    setModalMode('edit');
  }

  function closeModal() {
    setModalMode(null);
    setEditingContact(null);
    setForm(emptyForm());
    setFormErrors({});
  }

  async function handleSaveContact() {
    const validationErrors = validateContact(form);
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setSaving(true);
    setError('');

    const payload: EmergencyContactPayload = {
      name: form.name.trim(),
      relationship: form.relationship.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      isPrimary: form.isPrimary,
    };

    try {
      if (modalMode === 'edit' && editingContact) {
        await userApi.updateEmergencyContact(editingContact.id, payload);
        setToast('Contact updated successfully.');
      } else {
        await userApi.addEmergencyContact(payload);
        setToast('Contact added successfully.');
      }

      closeModal();
      await loadContacts();
    } catch (err) {
      setError(parseApiError(err, 'Unable to save this contact right now.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSetPrimary(contactId: string) {
    try {
      await userApi.setPrimaryEmergencyContact(contactId);
      setToast('Primary contact updated.');
      await loadContacts();
    } catch (err) {
      setError(parseApiError(err, 'Unable to update the primary contact.'));
    }
  }

  async function handleDeleteContact() {
    if (!deleteTarget) return;
    setSaving(true);
    setError('');
    try {
      await userApi.deleteEmergencyContact(deleteTarget.id);
      setDeleteTarget(null);
      setToast('Contact removed successfully.');
      await loadContacts();
    } catch (err) {
      setError(parseApiError(err, 'Unable to delete this contact.'));
    } finally {
      setSaving(false);
    }
  }

  if (!isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-light px-4 py-8 dark:bg-[#0B1026]">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-navy/55 transition-colors hover:text-navy dark:text-white/45 dark:hover:text-white/70">Back to dashboard</Link>
            <h1 className="mt-2 text-2xl font-bold text-navy dark:text-white">Emergency Contacts</h1>
            <p className="mt-1 text-sm text-navy/60 dark:text-white/40">People who will be notified in case of an emergency.</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-navy/10 px-3 py-1 text-sm font-medium text-navy dark:bg-white/10 dark:text-white">
              {contactCount} / {maxContacts} contacts added
            </span>
            <button
              type="button"
              onClick={openAddModal}
              disabled={disableAdd}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add Contact
            </button>
          </div>
        </div>

        {toast ? (
          <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-300">{toast}</div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-navy/10 bg-white p-8 text-sm text-navy/55 shadow-soft dark:border-white/10 dark:bg-white/5 dark:text-white/40">Loading emergency contacts...</div>
        ) : sortedContacts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-navy/15 bg-white p-12 text-center shadow-soft dark:border-white/10 dark:bg-white/5">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-2xl font-bold">+</span>
            </div>
            <h2 className="text-lg font-semibold text-navy dark:text-white">No emergency contacts added yet.</h2>
            <p className="mt-2 text-sm text-navy/60 dark:text-white/40">Add your first contact to stay protected.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedContacts.map((contact) => (
              <article key={contact.id} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-navy dark:text-white">{contact.name}</h2>
                    <p className="text-sm text-navy/55 dark:text-white/40">{contact.relationship}</p>
                  </div>
                  {contact.isPrimary ? (
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">PRIMARY</span>
                  ) : null}
                </div>

                <div className="mt-4 space-y-2 text-sm text-navy/75 dark:text-white/65">
                  <p>{contact.phone}</p>
                  {contact.email ? <p>{contact.email}</p> : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {!contact.isPrimary ? (
                    <button type="button" onClick={() => handleSetPrimary(contact.id)} className="rounded-lg border border-blue-500/20 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-500/10 dark:text-blue-300">
                      Set as Primary
                    </button>
                  ) : null}
                  <button type="button" onClick={() => openEditModal(contact)} className="rounded-lg border border-navy/15 px-3 py-2 text-sm font-medium text-navy transition-colors hover:bg-navy/5 dark:border-white/15 dark:text-white dark:hover:bg-white/5">
                    Edit
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(contact)} className="rounded-lg border border-emergency/25 px-3 py-2 text-sm font-medium text-emergency transition-colors hover:bg-emergency/10">
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {modalMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1026]/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-navy/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#111827]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-navy dark:text-white">{modalMode === 'add' ? 'Add Contact' : 'Edit Contact'}</h2>
              <button type="button" onClick={closeModal} className="text-sm text-navy/55 transition-colors hover:text-navy dark:text-white/45 dark:hover:text-white/70">Cancel</button>
            </div>

            <div className="mt-5 space-y-4">
              <FloatingLabelInput label="Name" type="text" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} error={formErrors.name} disabled={saving} />

              <div>
                <label className="mb-2 block text-sm font-medium text-navy dark:text-white">Relationship</label>
                <select
                  value={form.relationship}
                  onChange={(event) => setForm((prev) => ({ ...prev, relationship: event.target.value }))}
                  disabled={saving}
                  className="w-full rounded-xl border border-navy/15 bg-white px-4 py-3 text-sm text-navy outline-none transition focus:border-primary focus:ring-2 focus:ring-primary dark:border-white/15 dark:bg-white/5 dark:text-white"
                >
                  {RELATIONSHIP_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {formErrors.relationship ? <p className="mt-1.5 text-xs text-emergency">{formErrors.relationship}</p> : null}
              </div>

              <FloatingLabelInput label="Phone Number" type="tel" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} error={formErrors.phone} disabled={saving} />
              <FloatingLabelInput label="Email (optional)" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} error={formErrors.email} disabled={saving} />

              <label className="inline-flex items-center gap-3 text-sm font-medium text-navy dark:text-white">
                <input type="checkbox" checked={form.isPrimary} onChange={(event) => setForm((prev) => ({ ...prev, isPrimary: event.target.checked }))} disabled={saving} className="h-4 w-4 rounded border-navy/20 text-primary focus:ring-primary" />
                Set as primary contact
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="rounded-xl border border-navy/15 px-4 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-navy/5 dark:border-white/15 dark:text-white dark:hover:bg-white/5">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveContact} disabled={saving} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60">
                  {saving ? (modalMode === 'edit' ? 'Updating...' : 'Saving...') : modalMode === 'edit' ? 'Update Contact' : 'Save Contact'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1026]/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-navy/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#111827]">
            <h2 className="text-xl font-semibold text-navy dark:text-white">Remove Contact</h2>
            <p className="mt-3 text-sm text-navy/60 dark:text-white/40">Are you sure you want to remove {deleteTarget.name} from your emergency contacts?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border border-navy/15 px-4 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-navy/5 dark:border-white/15 dark:text-white dark:hover:bg-white/5">
                Cancel
              </button>
              <button type="button" onClick={handleDeleteContact} disabled={saving} className="rounded-xl bg-emergency px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60">
                {saving ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
