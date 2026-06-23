import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_client.dart';
import '../../core/realtime/socket_service.dart';
import '../auth/auth_controller.dart';

class WorkspaceDefinition {
  const WorkspaceDefinition(this.title, this.endpoint, this.icon);
  final String title;
  final String endpoint;
  final IconData icon;
}

const roleSections = <String, List<String>>{
  'POLICEMAN': ['overview', 'hotspot', 'sos', 'incidents', 'report'],
  'VOLUNTEER': ['overview', 'sos', 'cases', 'incident-map', 'check-in', 'zones'],
  'POLICE_DEPARTMENT': ['overview', 'policemen', 'hotspots', 'incidents', 'sos', 'zones', 'activity'],
  'NGO': ['overview', 'volunteers', 'incidents', 'assigned-incidents', 'sos', 'zones', 'activity'],
  'SUPERADMIN': ['overview', 'users', 'departments', 'ngos', 'hotspots', 'analytics', 'moderation', 'audit'],
};

const definitions = <String, WorkspaceDefinition>{
  'overview': WorkspaceDefinition('Overview', '/overview', Icons.dashboard_outlined),
  'hotspot': WorkspaceDefinition('My hotspot', '/hotspot', Icons.location_searching),
  'hotspots': WorkspaceDefinition('Hotspots', '/hotspots', Icons.location_searching),
  'sos': WorkspaceDefinition('SOS alerts', '/sos', Icons.sos),
  'incidents': WorkspaceDefinition('Incidents', '/incidents', Icons.report_outlined),
  'report': WorkspaceDefinition('Submit report', '/incidents', Icons.note_add_outlined),
  'cases': WorkspaceDefinition('Assigned cases', '/cases', Icons.work_outline),
  'incident-map': WorkspaceDefinition('Incident map', '/incidents/map', Icons.map_outlined),
  'check-in': WorkspaceDefinition('Field check-in', '/checkin/history', Icons.where_to_vote_outlined),
  'zones': WorkspaceDefinition('Safety zones', '/zones', Icons.shield_outlined),
  'policemen': WorkspaceDefinition('Policemen', '/policemen', Icons.local_police_outlined),
  'volunteers': WorkspaceDefinition('Volunteers', '/volunteers', Icons.volunteer_activism_outlined),
  'assigned-incidents': WorkspaceDefinition('Assigned incidents', '/incidents/assigned', Icons.assignment_turned_in_outlined),
  'activity': WorkspaceDefinition('Activity', '/activity', Icons.insights_outlined),
  'users': WorkspaceDefinition('Users', '/users', Icons.people_outline),
  'departments': WorkspaceDefinition('Police departments', '/departments', Icons.account_balance_outlined),
  'ngos': WorkspaceDefinition('NGOs', '/ngos', Icons.diversity_1_outlined),
  'analytics': WorkspaceDefinition('SOS analytics', '/analytics/sos', Icons.analytics_outlined),
  'moderation': WorkspaceDefinition('Moderation', '/moderation/queue', Icons.rule_outlined),
  'audit': WorkspaceDefinition('Audit log', '/audit-log', Icons.history),
};

String rolePrefix(String role) => switch (role) {
  'POLICEMAN' => '/officer',
  'VOLUNTEER' => '/volunteer',
  'POLICE_DEPARTMENT' => '/department',
  'NGO' => '/ngo',
  'SUPERADMIN' => '/admin',
  _ => '',
};

class RoleHomeScreen extends ConsumerStatefulWidget {
  const RoleHomeScreen({super.key});
  @override
  ConsumerState<RoleHomeScreen> createState() => _RoleHomeScreenState();
}

class _RoleHomeScreenState extends ConsumerState<RoleHomeScreen> {
  final socketService = SocketService();
  @override
  void initState() {
    super.initState();
    _connectRealtime();
  }

  Future<void> _connectRealtime() async {
    final user = ref.read(authProvider).user;
    if (user == null || user.isCitizen) {
      return;
    }
    final token = await ref.read(tokenStoreProvider).accessToken;
    if (token == null) {
      return;
    }
    final socket = socketService.connect(token);
    socket.on('SOS_CREATED', (data) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('New SOS alert: ${data is Map ? data['alertCode'] ?? '' : ''}'),
        action: SnackBarAction(label: 'OPEN', onPressed: () => context.push('/workspace/sos')),
      ));
    });
  }

  @override
  void dispose() {
    socketService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user!;
    if (user.isCitizen) return const _CitizenHome();
    final sections = roleSections[user.role] ?? const ['overview'];
    return Scaffold(
      appBar: AppBar(
        title: const Text('RakshaAI'),
        actions: [IconButton(onPressed: () => context.push('/settings'), icon: const Icon(Icons.settings_outlined))],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(authProvider.notifier).reloadUser(),
        child: ListView(padding: const EdgeInsets.all(16), children: [
          _WelcomeCard(name: user.fullName, role: user.role.replaceAll('_', ' ')),
          const SizedBox(height: 18),
          Text('Operational workspace', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 10),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: sections.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.18),
            itemBuilder: (_, i) {
              final key = sections[i];
              final definition = definitions[key]!;
              return Card(
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: () => context.push('/workspace/$key'),
                  child: Padding(padding: const EdgeInsets.all(16), child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(definition.icon, color: Theme.of(context).colorScheme.primary, size: 30),
                      const Spacer(),
                      Text(definition.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                      const Text('Open workspace', style: TextStyle(fontSize: 12, color: Colors.black54)),
                    ],
                  )),
                ),
              );
            },
          ),
        ]),
      ),
    );
  }
}

class _CitizenHome extends ConsumerWidget {
  const _CitizenHome();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user!;
    final items = [
      ('Journey', Icons.route, '/journey', Colors.blue),
      ('Safety map', Icons.map_outlined, '/map', Colors.green),
      ('Community', Icons.groups_outlined, '/community', Colors.purple),
      ('Contacts', Icons.contact_phone_outlined, '/contacts', Colors.teal),
      ('AI assistant', Icons.auto_awesome, '/ai', Colors.deepPurple),
      ('SOS history', Icons.history, '/workspace/history', Colors.orange),
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('RakshaAI'),
        actions: [IconButton(onPressed: () => context.push('/settings'), icon: const Icon(Icons.settings_outlined))]),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        _WelcomeCard(name: user.fullName, role: 'Citizen safety workspace'),
        const SizedBox(height: 20),
        Card(
          color: const Color(0xFFFFF0F1),
          child: Padding(padding: const EdgeInsets.all(20), child: Column(children: [
            const Text('Emergency?', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            SizedBox(width: 150, height: 70, child: FilledButton(
              style: FilledButton.styleFrom(backgroundColor: const Color(0xFFD72638)),
              onPressed: () => context.push('/sos'),
              child: const Text('SOS', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)))),
            const SizedBox(height: 8),
            const Text('Share your location and alert Raksha responders.'),
          ])),
        ),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), itemCount: items.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2, crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 1.35),
          itemBuilder: (_, i) {
            final item = items[i];
            return Card(child: InkWell(onTap: () => context.push(item.$3),
              child: Padding(padding: const EdgeInsets.all(14), child: Column(
                crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Icon(item.$2, color: item.$4), const Spacer(),
                  Text(item.$1, style: const TextStyle(fontWeight: FontWeight.w700)),
                ]))));
          },
        ),
      ]),
    );
  }
}

class _WelcomeCard extends StatelessWidget {
  const _WelcomeCard({required this.name, required this.role});
  final String name;
  final String role;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      gradient: const LinearGradient(colors: [Color(0xFF0B1026), Color(0xFF27325F)]),
      borderRadius: BorderRadius.circular(22),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Welcome back, ${name.split(' ').first}', style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
      const SizedBox(height: 6),
      Text(role, style: const TextStyle(color: Colors.white70)),
      const SizedBox(height: 16),
      const Row(children: [Icon(Icons.circle, color: Colors.greenAccent, size: 12), SizedBox(width: 8),
        Text('Raksha services online', style: TextStyle(color: Colors.white))]),
    ]),
  );
}

class WorkspaceSectionScreen extends ConsumerStatefulWidget {
  const WorkspaceSectionScreen({super.key, required this.section});
  final String section;
  @override
  ConsumerState<WorkspaceSectionScreen> createState() => _WorkspaceSectionScreenState();
}

class _WorkspaceSectionScreenState extends ConsumerState<WorkspaceSectionScreen> {
  late Future<dynamic> load = _fetch();

  Future<dynamic> _fetch() {
    final user = ref.read(authProvider).user!;
    if (widget.section == 'history') {
      return ref.read(apiClientProvider).get('/sos/history');
    }
    final definition = definitions[widget.section]!;
    return ref.read(apiClientProvider).get('${rolePrefix(user.role)}${definition.endpoint}');
  }

  void refresh() => setState(() => load = _fetch());

  Future<void> mutate(String path, String method, [Map<String, dynamic>? body]) async {
    final api = ref.read(apiClientProvider);
    try {
      if (method == 'patch') await api.patch(path, body);
      if (method == 'post') await api.post(path, body);
      if (method == 'delete') await api.delete(path, body);
      refresh();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Action completed')));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  List<Widget> actions(Map<String, dynamic> item) {
    final id = item['id']?.toString();
    if (id == null) return const [];
    final role = ref.read(authProvider).user!.role;
    final base = rolePrefix(role);
    final buttons = <Widget>[];
    if (widget.section == 'sos') {
      if (role == 'POLICEMAN') {
        buttons.add(_action('Acknowledge', () => mutate('$base/sos/$id/acknowledge', 'patch')));
        buttons.add(_action('Resolve', () => mutate('$base/sos/$id/resolve', 'patch')));
      } else if (role == 'VOLUNTEER') {
        buttons.add(_action('Respond', () => mutate('$base/sos/$id/respond', 'patch')));
        buttons.add(_action('Close', () => mutate('$base/sos/$id/close', 'patch')));
      } else if (role == 'NGO') {
        buttons.add(_action('Respond', () => mutate('$base/sos/$id/respond', 'patch', {})));
        buttons.add(_action('Close', () => mutate('$base/sos/$id/close', 'patch')));
      } else if (role == 'POLICE_DEPARTMENT') {
        buttons.add(_action('Resolve', () => mutate('$base/sos/$id/resolve', 'patch')));
      }
    }
    if (widget.section == 'incidents' && (role == 'POLICEMAN' || role == 'POLICE_DEPARTMENT')) {
      buttons.add(_action('Resolve', () => mutate('$base/incidents/$id/resolve', 'patch',
        role == 'POLICE_DEPARTMENT' ? {'resolutionNotes': 'Resolved from RakshaAI mobile'} : null)));
    }
    if ((widget.section == 'volunteers' || widget.section == 'policemen') && item['isActive'] is bool) {
      final active = item['isActive'] == true;
      buttons.add(_action(active ? 'Deactivate' : 'Reactivate',
        () => mutate('$base/${widget.section}/$id/${active ? 'deactivate' : 'reactivate'}', 'patch')));
    }
    return buttons;
  }

  Widget _action(String label, VoidCallback onPressed) =>
      Padding(padding: const EdgeInsets.only(right: 8), child: OutlinedButton(onPressed: onPressed, child: Text(label)));

  @override
  Widget build(BuildContext context) {
    final definition = widget.section == 'history'
        ? const WorkspaceDefinition('SOS history', '/sos/history', Icons.history)
        : definitions[widget.section]!;
    return Scaffold(
      appBar: AppBar(title: Text(definition.title)),
      floatingActionButton: (widget.section == 'report' || widget.section == 'check-in')
          ? FloatingActionButton.extended(onPressed: () => _openSubmission(widget.section),
              icon: const Icon(Icons.add), label: const Text('Submit'))
          : null,
      body: FutureBuilder(
        future: load,
        builder: (_, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Padding(padding: const EdgeInsets.all(24),
              child: Column(mainAxisSize: MainAxisSize.min, children: [Text('${snapshot.error}', textAlign: TextAlign.center),
                TextButton(onPressed: refresh, child: const Text('Try again'))])));
          }
          return RefreshIndicator(onRefresh: () async => refresh(),
              child: _DataView(data: snapshot.data, actions: actions));
        },
      ),
    );
  }

  Future<void> _openSubmission(String type) async {
    final description = TextEditingController();
    final ok = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: Text(type == 'report' ? 'Submit incident report' : 'Field check-in'),
      content: TextField(controller: description, maxLines: 4,
        decoration: InputDecoration(labelText: type == 'report' ? 'Incident description' : 'Check-in note')),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Submit'))],
    ));
    if (ok != true) return;
    final role = ref.read(authProvider).user!.role;
    if (type == 'report') {
      await mutate('/officer/incidents', 'post', {
        'type': 'other', 'description': description.text, 'severity': 'MEDIUM',
        'lat': 0.0, 'lng': 0.0,
      });
    } else if (role == 'VOLUNTEER') {
      await mutate('/volunteer/checkin', 'post', {'note': description.text, 'lat': 0.0, 'lng': 0.0});
    }
  }
}

class _DataView extends StatelessWidget {
  const _DataView({required this.data, required this.actions});
  final dynamic data;
  final List<Widget> Function(Map<String, dynamic>) actions;

  @override
  Widget build(BuildContext context) {
    final records = _records(data);
    if (records.isEmpty) {
      if (data is Map && (data as Map).isNotEmpty) {
        return ListView(padding: const EdgeInsets.all(14), children: [_RecordCard(Map<String, dynamic>.from(data), actions)]);
      }
      return ListView(children: const [SizedBox(height: 220), Center(child: Text('No records found.'))]);
    }
    return ListView.builder(
      padding: const EdgeInsets.all(12), itemCount: records.length,
      itemBuilder: (_, i) => _RecordCard(records[i], actions),
    );
  }

  static List<Map<String, dynamic>> _records(dynamic value) {
    if (value is List) return value.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
    if (value is Map) {
      for (final key in ['items', 'data', 'alerts', 'users', 'incidents', 'cases', 'zones',
        'volunteers', 'policemen', 'hotspots', 'departments', 'ngos', 'logs', 'reports']) {
        if (value[key] is List) {
          return (value[key] as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        }
      }
    }
    return [];
  }
}

class _RecordCard extends StatelessWidget {
  const _RecordCard(this.item, this.actionBuilder);
  final Map<String, dynamic> item;
  final List<Widget> Function(Map<String, dynamic>) actionBuilder;

  @override
  Widget build(BuildContext context) {
    final visible = item.entries.where((e) =>
      e.value != null && e.value is! Map && e.value is! List &&
      !['id', 'passwordHash', 'aadhaarNumber'].contains(e.key)).take(8).toList();
    final title = item['fullName'] ?? item['name'] ?? item['title'] ??
        item['alertCode'] ?? item['type'] ?? item['category'] ?? 'Record';
    final actions = actionBuilder(item);
    return Card(margin: const EdgeInsets.only(bottom: 10), child: Padding(
      padding: const EdgeInsets.all(15),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('$title', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        ...visible.where((e) => '${e.value}' != '$title').map((e) => Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Text('${_label(e.key)}: ${e.value}', maxLines: 3, overflow: TextOverflow.ellipsis),
        )),
        if (actions.isNotEmpty) ...[const Divider(), Wrap(children: actions)],
      ]),
    ));
  }

  static String _label(String input) =>
      input.replaceAllMapped(RegExp(r'([A-Z])'), (m) => ' ${m.group(1)}').replaceAll('_', ' ').trim();
}
