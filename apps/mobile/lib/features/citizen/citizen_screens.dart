import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/network/api_client.dart';
import '../../core/realtime/socket_service.dart';

Future<Position> _currentPosition() async {
  if (!await Geolocator.isLocationServiceEnabled()) {
    throw const ApiException('Turn on location services to continue.');
  }
  var permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
  }
  if (permission == LocationPermission.denied ||
      permission == LocationPermission.deniedForever) {
    throw const ApiException('Location permission is required for this feature.');
  }
  return Geolocator.getCurrentPosition(
    locationSettings: const LocationSettings(
      accuracy: LocationAccuracy.high,
      timeLimit: Duration(seconds: 15),
    ),
  );
}

class SosScreen extends ConsumerStatefulWidget {
  const SosScreen({super.key});
  @override
  ConsumerState<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends ConsumerState<SosScreen> {
  String type = 'general_danger';
  final description = TextEditingController();
  bool busy = false;

  Future<void> trigger() async {
    setState(() => busy = true);
    try {
      Position? position;
      try {
        position = await _currentPosition();
      } catch (error) {
        if (!mounted) return;
        final proceed = await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Location unavailable'),
            content: Text('$error\n\nSend SOS without a location?'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
              FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Send SOS')),
            ],
          ),
        );
        if (proceed != true) return;
      }
      final result = Map<String, dynamic>.from(
        await ref.read(apiClientProvider).post('/sos', {
          'triggerMethod': 'tap',
          'alertType': type,
          if (description.text.trim().isNotEmpty) 'description': description.text.trim(),
          if (position != null)
            'location': {
              'latitude': position.latitude,
              'longitude': position.longitude,
              'accuracy': position.accuracy,
            },
        }),
      );
      if (mounted) context.go('/sos/active?id=${result['id']}');
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFFFF3F3),
        appBar: AppBar(title: const Text('Emergency SOS')),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Icon(Icons.warning_amber_rounded, size: 54, color: Color(0xFFD72638)),
            const Text('Request immediate help', textAlign: TextAlign.center,
                style: TextStyle(fontSize: 25, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            const Text('Your latest available location will be shared with Raksha responders.',
                textAlign: TextAlign.center),
            const SizedBox(height: 24),
            DropdownButtonFormField<String>(
              initialValue: type,
              decoration: const InputDecoration(labelText: 'Emergency type'),
              items: const {
                'general_danger': 'General danger',
                'harassment': 'Harassment',
                'assault': 'Assault',
                'medical_emergency': 'Medical emergency',
                'kidnapping_risk': 'Kidnapping risk',
                'stalking': 'Stalking',
                'theft': 'Theft',
                'suspicious_activity': 'Suspicious activity',
              }.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
              onChanged: (value) => setState(() => type = value!),
            ),
            const SizedBox(height: 14),
            TextField(controller: description, maxLines: 3, maxLength: 1000,
                decoration: const InputDecoration(labelText: 'What is happening? (optional)')),
            const SizedBox(height: 20),
            SizedBox(
              height: 94,
              child: FilledButton(
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFFD72638),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(47))),
                onPressed: busy ? null : trigger,
                child: busy
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('HOLD FOR SOS', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
              ),
            ),
            const SizedBox(height: 18),
            OutlinedButton.icon(
              onPressed: () => launchUrl(Uri.parse('tel:112')),
              icon: const Icon(Icons.phone), label: const Text('Call emergency services: 112')),
          ],
        ),
      );
}

class ActiveSosScreen extends ConsumerStatefulWidget {
  const ActiveSosScreen({super.key, this.alertId});
  final String? alertId;
  @override
  ConsumerState<ActiveSosScreen> createState() => _ActiveSosScreenState();
}

class _ActiveSosScreenState extends ConsumerState<ActiveSosScreen> {
  final socketService = SocketService();
  StreamSubscription<Position>? locationStream;
  String status = 'active';
  String note = 'Alert sent. Connecting you with responders…';

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    if (widget.alertId == null) {
      return;
    }
    try {
      final token = await ref.read(tokenStoreProvider).accessToken;
      if (token == null) {
        return;
      }
      final socket = socketService.connect(token);
      socket.emit('JOIN_ALERT_ROOM', widget.alertId);
      socket.on('ALERT_STATUS_CHANGED', (data) {
        if (mounted && data is Map) {
          setState(() {
            status = '${data['status'] ?? status}';
            note = '${data['notes'] ?? 'Your alert status changed.'}';
          });
        }
      });
      socket.on('VOLUNTEER_ACCEPTED', (_) {
        if (mounted) setState(() => note = 'A volunteer is responding.');
      });
      socket.on('POLICE_ACCEPTED', (_) {
        if (mounted) setState(() => note = 'Police acknowledged your alert.');
      });
      socket.on('ALERT_RESOLVED', (_) {
        if (mounted) setState(() { status = 'resolved'; note = 'The alert has been resolved.'; });
      });
      locationStream = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 10,
        ),
      ).listen((position) {
        socket.emit('SEND_LOCATION', {
          'alertId': widget.alertId,
          'latitude': position.latitude,
          'longitude': position.longitude,
          'accuracy': position.accuracy,
        });
      });
    } catch (_) {
      // The REST alert remains active if realtime or location streaming degrades.
    }
  }

  Future<void> cancel() async {
    try {
      await ref.read(apiClientProvider).post('/sos/${widget.alertId}/cancel', {});
      if (mounted) {
        context.go('/home');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  void dispose() {
    locationStream?.cancel();
    socketService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Active SOS'), automaticallyImplyLeading: false),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Container(
              width: 180, height: 180,
              decoration: BoxDecoration(shape: BoxShape.circle,
                  color: status == 'resolved' ? Colors.green : const Color(0xFFD72638)),
              child: Icon(status == 'resolved' ? Icons.check : Icons.sos, color: Colors.white, size: 72),
            ),
            const SizedBox(height: 30),
            Text(status.toUpperCase(), style: const TextStyle(fontSize: 25, fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            Text(note, textAlign: TextAlign.center, style: const TextStyle(fontSize: 16)),
            const SizedBox(height: 30),
            if (status != 'resolved')
              OutlinedButton(onPressed: cancel, child: const Text('Cancel alert — I am safe')),
            const SizedBox(height: 8),
            TextButton(onPressed: () => launchUrl(Uri.parse('tel:112')), child: const Text('Call 112')),
          ]),
        ),
      );
}

class ContactsScreen extends ConsumerStatefulWidget {
  const ContactsScreen({super.key});
  @override
  ConsumerState<ContactsScreen> createState() => _ContactsScreenState();
}

class _ContactsScreenState extends ConsumerState<ContactsScreen> {
  late Future<dynamic> load = _fetch();
  Future<dynamic> _fetch() => ref.read(apiClientProvider).get('/emergency-contacts');
  void refresh() => setState(() => load = _fetch());

  Future<void> add() async {
    final name = TextEditingController();
    final relation = TextEditingController();
    final phone = TextEditingController();
    final accepted = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: const Text('Add emergency contact'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
        const SizedBox(height: 8),
        TextField(controller: relation, decoration: const InputDecoration(labelText: 'Relationship')),
        const SizedBox(height: 8),
        TextField(controller: phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone')),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Add')),
      ],
    ));
    if (accepted == true) {
      await ref.read(apiClientProvider).post('/emergency-contacts', {
        'name': name.text.trim(), 'relationship': relation.text.trim(),
        'phone': phone.text.trim(), 'isPrimary': false,
      });
      refresh();
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Emergency contacts')),
    floatingActionButton: FloatingActionButton.extended(onPressed: add, icon: const Icon(Icons.add), label: const Text('Add')),
    body: FutureBuilder(
      future: load,
      builder: (_, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
        if (snapshot.hasError) return _ErrorState('$snapshot.error', refresh);
        final contacts = snapshot.data is List ? snapshot.data as List : <dynamic>[];
        if (contacts.isEmpty) return const Center(child: Text('No emergency contacts yet.'));
        return ListView.builder(padding: const EdgeInsets.all(12), itemCount: contacts.length, itemBuilder: (_, i) {
          final item = Map<String, dynamic>.from(contacts[i]);
          return Card(child: ListTile(
            leading: CircleAvatar(child: Text('${item['name'] ?? '?'}'.characters.first)),
            title: Text('${item['name']}'),
            subtitle: Text('${item['relationship']} • ${item['phone']}'),
            trailing: PopupMenuButton<String>(onSelected: (action) async {
              final api = ref.read(apiClientProvider);
              if (action == 'primary') await api.patch('/emergency-contacts/${item['id']}/primary');
              if (action == 'delete') await api.delete('/emergency-contacts/${item['id']}');
              refresh();
            }, itemBuilder: (_) => const [
              PopupMenuItem(value: 'primary', child: Text('Set primary')),
              PopupMenuItem(value: 'delete', child: Text('Delete')),
            ]),
          ));
        });
      },
    ),
  );
}

class SafetyMapScreen extends ConsumerStatefulWidget {
  const SafetyMapScreen({super.key});
  @override
  ConsumerState<SafetyMapScreen> createState() => _SafetyMapScreenState();
}

class _SafetyMapScreenState extends ConsumerState<SafetyMapScreen> {
  LatLng center = const LatLng(28.6139, 77.2090);
  List<Marker> markers = [];
  String risk = 'Move the map to inspect your area.';

  @override
  void initState() { super.initState(); _locate(); }
  Future<void> _locate() async {
    try {
      final p = await _currentPosition();
      center = LatLng(p.latitude, p.longitude);
      final api = ref.read(apiClientProvider);
      final results = await Future.wait([
        api.get('/maps/nearby/volunteers', queryParameters: {'latitude': p.latitude, 'longitude': p.longitude}),
        api.get('/maps/nearby/police', queryParameters: {'latitude': p.latitude, 'longitude': p.longitude}),
        api.get('/maps/nearby/safe-zones', queryParameters: {'latitude': p.latitude, 'longitude': p.longitude}),
        api.get('/maps/risk', queryParameters: {'latitude': p.latitude, 'longitude': p.longitude}),
      ]);
      final newMarkers = <Marker>[
        Marker(point: center, width: 42, height: 42,
            child: const Icon(Icons.my_location, color: Colors.blue, size: 36)),
      ];
      for (var group = 0; group < 3; group++) {
        final list = results[group] is List ? results[group] as List : const [];
        for (final raw in list) {
          if (raw is! Map) {
            continue;
          }
          final lat = num.tryParse('${raw['latitude'] ?? raw['lat']}')?.toDouble();
          final lng = num.tryParse('${raw['longitude'] ?? raw['lng']}')?.toDouble();
          if (lat == null || lng == null) {
            continue;
          }
          newMarkers.add(Marker(point: LatLng(lat, lng), width: 38, height: 38,
            child: Icon([Icons.volunteer_activism, Icons.local_police, Icons.health_and_safety][group],
                color: [Colors.orange, Colors.indigo, Colors.green][group])));
        }
      }
      if (mounted) {
        setState(() {
          markers = newMarkers;
          risk = results[3] is Map ? 'Area risk: ${results[3]['riskLevel'] ?? results[3]['level'] ?? 'available'}' : 'Risk analysis loaded';
        });
      }
    } catch (e) {
      if (mounted) setState(() => risk = '$e');
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Safety map')),
    body: Column(children: [
      Material(color: Colors.white, child: ListTile(leading: const Icon(Icons.shield), title: Text(risk))),
      Expanded(child: FlutterMap(
        options: MapOptions(initialCenter: center, initialZoom: 14),
        children: [
          TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'codes.rishit.raksha'),
          MarkerLayer(markers: markers),
          RichAttributionWidget(attributions: [
            TextSourceAttribution('OpenStreetMap contributors',
              onTap: () => launchUrl(Uri.parse('https://openstreetmap.org/copyright'))),
          ]),
        ],
      )),
    ]),
    floatingActionButton: FloatingActionButton(onPressed: _locate, child: const Icon(Icons.my_location)),
  );
}

class CommunityScreen extends ConsumerStatefulWidget {
  const CommunityScreen({super.key});
  @override
  ConsumerState<CommunityScreen> createState() => _CommunityScreenState();
}

class _CommunityScreenState extends ConsumerState<CommunityScreen> {
  late Future<dynamic> load = ref.read(apiClientProvider).get('/community');
  void refresh() => setState(() => load = ref.read(apiClientProvider).get('/community'));

  Future<void> report() async {
    final title = TextEditingController();
    final description = TextEditingController();
    final ok = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: const Text('Report a safety concern'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: title, decoration: const InputDecoration(labelText: 'Title')),
        const SizedBox(height: 8),
        TextField(controller: description, maxLines: 3, decoration: const InputDecoration(labelText: 'Description')),
      ]),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Continue'))],
    ));
    if (ok != true) return;
    try {
      final p = await _currentPosition();
      await ref.read(apiClientProvider).post('/community', {
        'category': 'unsafe_area', 'title': title.text, 'description': description.text,
        'latitude': p.latitude, 'longitude': p.longitude, 'isAnonymous': false,
      });
      refresh();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Community safety')),
    floatingActionButton: FloatingActionButton.extended(onPressed: report, icon: const Icon(Icons.add), label: const Text('Report')),
    body: FutureBuilder(future: load, builder: (_, snapshot) {
      if (snapshot.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
      if (snapshot.hasError) return _ErrorState('${snapshot.error}', refresh);
      final raw = snapshot.data;
      final reports = raw is List ? raw : raw is Map && raw['reports'] is List ? raw['reports'] as List : <dynamic>[];
      if (reports.isEmpty) return const Center(child: Text('No community reports found.'));
      return RefreshIndicator(onRefresh: () async => refresh(), child: ListView.builder(
        padding: const EdgeInsets.all(12), itemCount: reports.length, itemBuilder: (_, i) {
          final item = Map<String, dynamic>.from(reports[i]);
          return Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(
            crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${item['title'] ?? item['category'] ?? 'Safety report'}',
                style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Text('${item['description'] ?? 'Location-based community safety signal'}'),
              const SizedBox(height: 8),
              Row(children: [const Icon(Icons.location_on_outlined, size: 16),
                Expanded(child: Text('${item['address'] ?? item['city'] ?? 'Reported location'}'))]),
            ],
          )));
        },
      ));
    }),
  );
}

class AiAssistantScreen extends ConsumerStatefulWidget {
  const AiAssistantScreen({super.key});
  @override
  ConsumerState<AiAssistantScreen> createState() => _AiAssistantScreenState();
}

class _AiAssistantScreenState extends ConsumerState<AiAssistantScreen> {
  final input = TextEditingController();
  final messages = <Map<String, String>>[
    {'role': 'model', 'content': 'I can help with safety guidance, legal rights, and next steps. In an immediate emergency, use SOS or call 112.'}
  ];
  bool busy = false;

  Future<void> send([String? quick]) async {
    final text = (quick ?? input.text).trim();
    if (text.isEmpty || busy) return;
    setState(() { messages.add({'role': 'user', 'content': text}); input.clear(); busy = true; });
    try {
      final result = Map<String, dynamic>.from(await ref.read(apiClientProvider).post('/ai/chat', {
        'messages': messages.where((m) => m != messages.first).toList(),
      }));
      setState(() => messages.add({'role': 'model', 'content': '${result['reply']}'}));
    } catch (e) {
      setState(() => messages.add({'role': 'model', 'content': '$e'}));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('AI safety assistant')),
    body: Column(children: [
      SizedBox(height: 48, child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 8),
        children: ['I feel unsafe', 'Legal rights', 'Travel safety'].map((text) =>
          Padding(padding: const EdgeInsets.all(4), child: ActionChip(label: Text(text), onPressed: () => send(text)))).toList())),
      Expanded(child: ListView.builder(padding: const EdgeInsets.all(16), itemCount: messages.length + (busy ? 1 : 0),
        itemBuilder: (_, i) {
          if (i == messages.length) return const Text('RakshaAI is thinking…');
          final message = messages[i];
          final user = message['role'] == 'user';
          return Align(alignment: user ? Alignment.centerRight : Alignment.centerLeft,
            child: Container(margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(13),
              constraints: const BoxConstraints(maxWidth: 310),
              decoration: BoxDecoration(color: user ? const Color(0xFFFF6B2D) : Colors.white,
                borderRadius: BorderRadius.circular(18)),
              child: Text(message['content']!, style: TextStyle(color: user ? Colors.white : null))));
        })),
      SafeArea(child: Padding(padding: const EdgeInsets.all(10), child: Row(children: [
        Expanded(child: TextField(controller: input, decoration: const InputDecoration(hintText: 'Ask about safety…'))),
        IconButton.filled(onPressed: send, icon: const Icon(Icons.send)),
      ]))),
    ]),
  );
}

class JourneyScreen extends StatefulWidget {
  const JourneyScreen({super.key});
  @override
  State<JourneyScreen> createState() => _JourneyScreenState();
}

class _JourneyScreenState extends State<JourneyScreen> {
  final destination = TextEditingController();
  DateTime? started;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Journey mode')),
    body: Padding(padding: const EdgeInsets.all(20), child: Column(children: [
      const Icon(Icons.route, size: 70, color: Color(0xFFFF6B2D)),
      const SizedBox(height: 20),
      TextField(controller: destination, decoration: const InputDecoration(labelText: 'Destination')),
      const SizedBox(height: 16),
      if (started != null) Card(child: ListTile(leading: const Icon(Icons.navigation),
        title: const Text('Journey monitoring active'),
        subtitle: Text('Started at ${started!.hour.toString().padLeft(2, '0')}:${started!.minute.toString().padLeft(2, '0')}'))),
      const Spacer(),
      SizedBox(width: double.infinity, child: FilledButton(
        onPressed: () => setState(() => started = started == null ? DateTime.now() : null),
        child: Text(started == null ? 'Start journey' : 'End journey'))),
      TextButton(onPressed: () => context.push('/sos'), child: const Text('Need help now? Open SOS')),
    ])),
  );
}

class _ErrorState extends StatelessWidget {
  const _ErrorState(this.message, this.retry);
  final String message;
  final VoidCallback retry;
  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(24),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.cloud_off, size: 50), const SizedBox(height: 12),
      Text(message, textAlign: TextAlign.center), TextButton(onPressed: retry, child: const Text('Try again')),
    ])));
}
