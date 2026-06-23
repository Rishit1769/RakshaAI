import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_client.dart';
import 'auth_controller.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});
  @override
  Widget build(BuildContext context) => const Scaffold(
        backgroundColor: Color(0xFF0B1026),
        body: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.shield_rounded, color: Color(0xFFFF6B2D), size: 72),
            SizedBox(height: 16),
            Text('RakshaAI',
                style: TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.w800)),
            SizedBox(height: 20),
            CircularProgressIndicator(color: Color(0xFFFF6B2D)),
          ]),
        ),
      );
}

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final identifier = TextEditingController();
  final credential = TextEditingController();
  bool mpin = false;
  bool busy = false;

  Future<void> submit() async {
    if (identifier.text.trim().isEmpty || credential.text.isEmpty) return;
    setState(() => busy = true);
    try {
      await ref.read(authProvider.notifier).login(
            identifier: identifier.text,
            credential: credential.text,
            method: mpin ? 'mpin' : 'password',
          );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const SizedBox(height: 40),
              const Icon(Icons.shield_rounded, size: 70, color: Color(0xFFFF6B2D)),
              const SizedBox(height: 16),
              Text('Welcome to RakshaAI', textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              const Text('One secure app for citizens, responders, and coordinators.',
                  textAlign: TextAlign.center),
              const SizedBox(height: 32),
              TextField(controller: identifier,
                  decoration: const InputDecoration(labelText: 'Email or phone', prefixIcon: Icon(Icons.person_outline))),
              const SizedBox(height: 14),
              TextField(controller: credential, obscureText: true,
                  keyboardType: mpin ? TextInputType.number : null,
                  maxLength: mpin ? 6 : null,
                  decoration: InputDecoration(labelText: mpin ? '6-digit MPIN' : 'Password',
                      prefixIcon: const Icon(Icons.lock_outline))),
              SwitchListTile(
                value: mpin,
                onChanged: (value) => setState(() => mpin = value),
                title: const Text('Sign in with MPIN'),
                contentPadding: EdgeInsets.zero,
              ),
              const SizedBox(height: 12),
              FilledButton(onPressed: busy ? null : submit,
                  child: busy ? const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Sign in')),
              TextButton(onPressed: () => context.go('/register'),
                  child: const Text('Create a citizen account')),
            ],
          ),
        ),
      );
}

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});
  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final email = TextEditingController();
  final otp = TextEditingController();
  final name = TextEditingController();
  final phone = TextEditingController();
  final aadhaar = TextEditingController();
  final password = TextEditingController();
  int step = 0;
  bool busy = false;

  Future<void> next() async {
    setState(() => busy = true);
    final api = ref.read(apiClientProvider);
    try {
      if (step == 0) {
        await api.post('/auth/register/send-otp', {'email': email.text.trim()});
        setState(() => step = 1);
      } else {
        final result = await api.post('/auth/register/verify-otp', {
          'email': email.text.trim(),
          'otp': otp.text.trim(),
          'fullName': name.text.trim(),
          'phone': phone.text.trim(),
          'aadhaarNumber': aadhaar.text.trim(),
          'password': password.text,
        });
        await ref.read(authProvider.notifier).acceptAuthResult(result);
      }
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Create account')),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(step == 0 ? 'Verify your email' : 'Complete your safety profile',
                style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 20),
            TextField(controller: email, enabled: step == 0,
                keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email')),
            if (step == 1) ...[
              const SizedBox(height: 12),
              TextField(controller: otp, keyboardType: TextInputType.number, maxLength: 6,
                  decoration: const InputDecoration(labelText: 'Email OTP')),
              TextField(controller: name, decoration: const InputDecoration(labelText: 'Full name')),
              const SizedBox(height: 12),
              TextField(controller: phone, keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Indian phone number')),
              const SizedBox(height: 12),
              TextField(controller: aadhaar, keyboardType: TextInputType.number, maxLength: 12,
                  obscureText: true, decoration: const InputDecoration(labelText: 'Aadhaar number')),
              TextField(controller: password, obscureText: true,
                  decoration: const InputDecoration(labelText: 'Password')),
              const SizedBox(height: 8),
              const Text('Use 8+ characters with uppercase, lowercase, and a number.'),
            ],
            const SizedBox(height: 20),
            FilledButton(onPressed: busy ? null : next,
                child: Text(step == 0 ? 'Send OTP' : 'Create account')),
          ],
        ),
      );
}

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});
  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final current = TextEditingController();
  final next = TextEditingController();
  final confirm = TextEditingController();

  Future<void> changePassword() async {
    try {
      await ref.read(apiClientProvider).post('/auth/change-password', {
        'currentPassword': current.text,
        'newPassword': next.text,
        'confirmPassword': confirm.text,
      });
      await ref.read(authProvider.notifier).reloadUser();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password updated')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    return Scaffold(
      appBar: AppBar(title: const Text('Account & security')),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        ListTile(leading: const CircleAvatar(child: Icon(Icons.person)),
          title: Text(user?.fullName ?? ''), subtitle: Text('${user?.email ?? ''}\n${user?.role ?? ''}')),
        const Divider(),
        Text('Change password', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        TextField(controller: current, obscureText: true, decoration: const InputDecoration(labelText: 'Current password')),
        const SizedBox(height: 12),
        TextField(controller: next, obscureText: true, decoration: const InputDecoration(labelText: 'New password')),
        const SizedBox(height: 12),
        TextField(controller: confirm, obscureText: true, decoration: const InputDecoration(labelText: 'Confirm password')),
        const SizedBox(height: 12),
        FilledButton(onPressed: changePassword, child: const Text('Update password')),
        const SizedBox(height: 24),
        OutlinedButton.icon(
          onPressed: () => ref.read(authProvider.notifier).logout(),
          icon: const Icon(Icons.logout), label: const Text('Sign out')),
      ]),
    );
  }
}
