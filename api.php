<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$dbFile = __DIR__ . '/game.sqlite';
$db = new PDO('sqlite:' . $dbFile);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$db->exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 3000;');

// Inicializar tablas si no existen
$db->exec("
CREATE TABLE IF NOT EXISTS config (
    k TEXT PRIMARY KEY,
    v TEXT
);
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar INT DEFAULT 0,
    is_host INT DEFAULT 0,
    last_seen INT DEFAULT 0,
    eliminated INT DEFAULT 0
);
CREATE TABLE IF NOT EXISTS places (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS used_places (
    place_id INTEGER PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS votes (
    voter_id TEXT PRIMARY KEY,
    target_id TEXT NOT NULL
);
");

// Configuración e inicialización por defecto
$defaults = [
    'host_user' => 'irvin',
    'host_pass' => 'admin1.',
    'max_rounds' => '3',
    'first_turn_sec' => '20',
    'turn_sec' => '10',
    'status' => 'lobby', // lobby | questioning | voting | round_result | game_over
    'current_round' => '1',
    'current_place' => '',
    'spy_id' => '',
    'turn_order' => '[]',
    'turn_index' => '0',
    'turn_ends_at' => '0',
    'last_event' => ''
];

$stmt = $db->prepare("INSERT OR IGNORE INTO config (k, v) VALUES (?, ?)");
foreach ($defaults as $k => $v) {
    $stmt->execute([$k, $v]);
}

// Pre-crear el usuario Host (irvin) en la tabla de jugadores
$db->prepare("
    INSERT OR IGNORE INTO players (id, name, avatar, is_host, last_seen, eliminated)
    VALUES ('host_irvin', 'irvin', 0, 1, 0, 0)
")->execute();

// Semilla inicial de lugares si está vacía
$countPlaces = (int)$db->query("SELECT COUNT(*) FROM places")->fetchColumn();
if ($countPlaces === 0) {
    $initialPlaces = [
        'Aeropuerto', 'Hospital', 'Playa', 'Casino', 'Supermercado',
        'Cine', 'Restaurante', 'Escuela', 'Estación de Policía', 'Banco',
        'Circo', 'Crucero', 'Estación Espacial', 'Submarino', 'Hotel',
        'Gimnasio', 'Parque de Diversiones', 'Museo', 'Biblioteca', 'Zoológico',
        'Estadio de Fútbol', 'Teatro', 'Base Militar', 'Taller Mecánico', 'Avión',
        'Boda', 'Cementerio', 'Discoteca', 'Universidad', 'Granja'
    ];
    $ins = $db->prepare("INSERT OR IGNORE INTO places (name) VALUES (?)");
    foreach ($initialPlaces as $p) {
        $ins->execute([$p]);
    }
}

function getConfig(PDO $db): array {
    $rows = $db->query("SELECT k, v FROM config")->fetchAll();
    $cfg = [];
    foreach ($rows as $r) $cfg[$r['k']] = $r['v'];
    return $cfg;
}

function setConfig(PDO $db, array $pairs): void {
    $stmt = $db->prepare("INSERT OR REPLACE INTO config (k, v) VALUES (?, ?)");
    foreach ($pairs as $k => $v) {
        $stmt->execute([$k, (string)$v]);
    }
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $_GET['action'] ?? $input['action'] ?? 'state';
$playerId = $_GET['player_id'] ?? $input['player_id'] ?? '';
$now = time();

// Actualizar presencia del jugador
if ($playerId !== '') {
    $db->prepare("UPDATE players SET last_seen = ? WHERE id = ?")->execute([$now, $playerId]);
}

$cfg = getConfig($db);

// Verificar si el jugador actual es host
$me = null;
if ($playerId !== '') {
    $st = $db->prepare("SELECT * FROM players WHERE id = ?");
    $st->execute([$playerId]);
    $me = $st->fetch() ?: null;
}
$isHost = $me && (int)$me['is_host'] === 1;

// Auto-avanzar turnos de preguntas cuando el reloj llega a 0
if ($cfg['status'] === 'questioning') {
    $turnOrder = json_decode($cfg['turn_order'], true) ?: [];
    $turnIndex = (int)$cfg['turn_index'];
    $turnEndsAt = (int)$cfg['turn_ends_at'];

    if ($now >= $turnEndsAt && count($turnOrder) > 0) {
        $nextIndex = $turnIndex + 1;
        if ($nextIndex >= count($turnOrder)) {
            $db->exec("DELETE FROM votes");
            setConfig($db, [
                'status' => 'voting',
                'turn_index' => '0',
                'turn_ends_at' => '0'
            ]);
        } else {
            $sec = (int)$cfg['turn_sec'];
            setConfig($db, [
                'turn_index' => (string)$nextIndex,
                'turn_ends_at' => (string)($now + $sec)
            ]);
        }
        $cfg = getConfig($db);
    }
}

function startQuestionRound(PDO $db, int $roundNum, array $cfg): void {
    $players = $db->query("SELECT id FROM players ORDER BY rowid ASC")->fetchAll(PDO::FETCH_COLUMN);
    shuffle($players);
    // El primer jugador en preguntar en cada ronda tiene first_turn_sec (por defecto 20s)
    $sec = (int)$cfg['first_turn_sec'];
    $db->exec("DELETE FROM votes");
    setConfig($db, [
        'status' => 'questioning',
        'current_round' => (string)$roundNum,
        'turn_order' => json_encode(array_values($players)),
        'turn_index' => '0',
        'turn_ends_at' => (string)(time() + $sec)
    ]);
}

function evaluateVotes(PDO $db, array $cfg): void {
    $players = $db->query("SELECT * FROM players")->fetchAll();
    $totalPlayers = count($players);
    // Mayoría = al menos 1/3 de los jugadores redondeando hacia arriba
    $threshold = max(1, (int)ceil($totalPlayers / 3));

    $votes = $db->query("SELECT voter_id, target_id FROM votes")->fetchAll();
    $counts = [];
    foreach ($votes as $v) {
        $t = $v['target_id'];
        if ($t === 'pass') continue;
        $counts[$t] = ($counts[$t] ?? 0) + 1;
    }

    arsort($counts);
    $topTargetId = key($counts);
    $topVotes = $topTargetId ? $counts[$topTargetId] : 0;

    $currentRound = (int)$cfg['current_round'];
    $maxRounds = (int)$cfg['max_rounds'];
    $spyId = $cfg['spy_id'];

    $playersById = [];
    foreach ($players as $p) $playersById[$p['id']] = $p;
    $spyName = $playersById[$spyId]['name'] ?? 'Espía';

    // Si alguien alcanza al menos 1/3 de los votos, se revela su rol
    if ($topTargetId && $topVotes >= $threshold) {
        $accusedName = $playersById[$topTargetId]['name'] ?? 'Jugador';
        if ($topTargetId === $spyId) {
            // ¡Descubrieron al espía! Se termina la partida
            setConfig($db, [
                'status' => 'game_over',
                'last_event' => json_encode([
                    'winner' => 'players',
                    'title' => '¡ESPÍA DESCUBIERTO!',
                    'message' => "¡{$accusedName} recibió {$topVotes} votos (mínimo {$threshold}) y ERA EL ESPÍA! El lugar secreto era: {$cfg['current_place']}.",
                    'spy_id' => $spyId,
                    'spy_name' => $spyName,
                    'place' => $cfg['current_place'],
                    'threshold' => $threshold,
                    'votes' => $counts
                ])
            ]);
            return;
        } else {
            // Se revela que NO es el espía
            $db->prepare("UPDATE players SET eliminated = 1 WHERE id = ?")->execute([$topTargetId]);
            if ($currentRound >= $maxRounds) {
                // En la última ronda es todo o nada: si acusan a un inocente, gana el espía
                setConfig($db, [
                    'status' => 'game_over',
                    'last_event' => json_encode([
                        'winner' => 'spy',
                        'title' => '¡EL ESPÍA GANÓ!',
                        'message' => "Acusaron a {$accusedName} ({$topVotes} votos), pero NO ERA EL ESPÍA. Se acabaron las {$maxRounds} rondas y {$spyName} logró pasar desapercibido.",
                        'spy_id' => $spyId,
                        'spy_name' => $spyName,
                        'place' => $cfg['current_place'],
                        'threshold' => $threshold,
                        'votes' => $counts
                    ])
                ]);
            } else {
                // Rondas 1 y 2: se revela que es inocente y continúa a la siguiente ronda
                setConfig($db, [
                    'status' => 'round_result',
                    'last_event' => json_encode([
                        'type' => 'innocent_revealed',
                        'title' => '¡INOCENTE REVELADO!',
                        'message' => "{$accusedName} recibió {$topVotes} votos (mínimo {$threshold}), pero NO ES EL ESPÍA. Continúa la partida hacia la Ronda " . ($currentRound + 1) . ".",
                        'accused_name' => $accusedName,
                        'accused_id' => $topTargetId,
                        'votes_count' => $topVotes,
                        'threshold' => $threshold,
                        'votes' => $counts
                    ])
                ]);
            }
            return;
        }
    }

    // Si nadie alcanzó el tercio de votos
    if ($currentRound >= $maxRounds) {
        setConfig($db, [
            'status' => 'game_over',
            'last_event' => json_encode([
                'winner' => 'spy',
                'title' => '¡EL ESPÍA LOGRO ESCAPAR!',
                'message' => "No descubrieron al espía en las {$maxRounds} rondas. ¡{$spyName} pasó desapercibido! El lugar era: {$cfg['current_place']}.",
                'spy_id' => $spyId,
                'spy_name' => $spyName,
                'place' => $cfg['current_place'],
                'threshold' => $threshold,
                'votes' => $counts
            ])
        ]);
    } else {
        setConfig($db, [
            'status' => 'round_result',
            'last_event' => json_encode([
                'type' => 'no_majority',
                'title' => 'NADIE FUE REVELADO',
                'message' => "Ningún jugador recibió al menos {$threshold} votos (1/3 de la sala). Pasamos a la Ronda " . ($currentRound + 1) . ".",
                'threshold' => $threshold,
                'votes' => $counts
            ])
        ]);
    }
}

switch ($action) {
    case 'join':
        $name = trim($input['name'] ?? '');
        $avatar = (int)($input['avatar'] ?? 0);
        $asHost = !empty($input['as_host']);
        $pass = $input['password'] ?? '';

        if ($name === '') {
            echo json_encode(['error' => 'Escribe tu nombre para entrar']);
            exit;
        }
        if ($asHost) {
            $expectedUser = strtolower($cfg['host_user'] ?? 'irvin');
            if (strtolower($name) !== $expectedUser || $pass !== $cfg['host_pass']) {
                echo json_encode(['error' => 'Usuario o contraseña de Host incorrectos']);
                exit;
            }
        } elseif (strtolower($name) === strtolower($cfg['host_user'] ?? 'irvin')) {
            echo json_encode(['error' => 'El nombre "' . $cfg['host_user'] . '" está reservado para el Host']);
            exit;
        }

        $id = $input['player_id'] ?? '';
        if ($asHost) {
            $id = 'host_irvin';
        } else {
            // Para invitados: buscar si ya existe un invitado con ese mismo nombre, o si no crear un ID único nuevo
            $stCheck = $db->prepare("SELECT id FROM players WHERE lower(name) = lower(?) AND is_host = 0 LIMIT 1");
            $stCheck->execute([$name]);
            $existingGuestId = $stCheck->fetchColumn();
            if ($existingGuestId) {
                $id = $existingGuestId;
            } elseif ($id === '' || $id === 'host_irvin') {
                $id = bin2hex(random_bytes(8));
            } else {
                // Si traía un ID en sesión pero con otro nombre distinto, generar nuevo ID para no sobrescribir al jugador anterior
                $stOld = $db->prepare("SELECT name FROM players WHERE id = ?");
                $stOld->execute([$id]);
                $oldName = $stOld->fetchColumn();
                if ($oldName !== false && strtolower($oldName) !== strtolower($name)) {
                    $id = bin2hex(random_bytes(8));
                }
            }
        }

        $stmt = $db->prepare("
            INSERT INTO players (id, name, avatar, is_host, last_seen, eliminated)
            VALUES (?, ?, ?, ?, ?, 0)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                avatar = excluded.avatar,
                is_host = CASE WHEN excluded.is_host = 1 THEN 1 ELSE players.is_host END,
                last_seen = excluded.last_seen
        ");
        $stmt->execute([$id, $name, $avatar, $asHost ? 1 : 0, $now]);
        $playerId = $id;
        $st = $db->prepare("SELECT * FROM players WHERE id = ?");
        $st->execute([$playerId]);
        $me = $st->fetch() ?: null;
        $isHost = $me && (int)$me['is_host'] === 1;
        $cfg = getConfig($db);
        break;

    case 'kick_player':
        if (!$isHost) { echo json_encode(['error' => 'No autorizado']); exit; }
        $target = $input['target_id'] ?? '';
        $db->prepare("DELETE FROM players WHERE id = ?")->execute([$target]);
        $db->prepare("DELETE FROM votes WHERE voter_id = ? OR target_id = ?")->execute([$target, $target]);
        break;

    case 'start_game':
        if (!$isHost) { echo json_encode(['error' => 'Solo el Host puede iniciar']); exit; }
        $db->exec("UPDATE players SET eliminated = 0");
        $players = $db->query("SELECT id FROM players ORDER BY rowid ASC")->fetchAll(PDO::FETCH_COLUMN);
        if (count($players) < 3) {
            echo json_encode(['error' => 'Se necesitan al menos 3 jugadores en la sala para empezar']);
            exit;
        }

        // Elegir un lugar al azar que no esté en used_places
        $avail = $db->query("
            SELECT id, name FROM places
            WHERE id NOT IN (SELECT place_id FROM used_places)
        ")->fetchAll();

        if (count($avail) === 0) {
            $db->exec("DELETE FROM used_places");
            $avail = $db->query("SELECT id, name FROM places")->fetchAll();
        }
        if (count($avail) === 0) {
            echo json_encode(['error' => 'No hay lugares registrados. Agrega lugares en Ajustes.']);
            exit;
        }

        $picked = $avail[array_rand($avail)];
        $db->prepare("INSERT OR IGNORE INTO used_places (place_id) VALUES (?)")->execute([$picked['id']]);

        $spyId = $players[array_rand($players)];

        setConfig($db, [
            'current_place' => $picked['name'],
            'spy_id' => $spyId,
            'last_event' => ''
        ]);
        $cfg = getConfig($db);
        startQuestionRound($db, 1, $cfg);
        $cfg = getConfig($db);
        break;

    case 'next_turn':
        if (!$isHost) { echo json_encode(['error' => 'Solo el Host puede avanzar el turno']); exit; }
        if ($cfg['status'] === 'questioning') {
            $turnOrder = json_decode($cfg['turn_order'], true) ?: [];
            $nextIndex = (int)$cfg['turn_index'] + 1;
            if ($nextIndex >= count($turnOrder)) {
                $db->exec("DELETE FROM votes");
                setConfig($db, ['status' => 'voting', 'turn_index' => '0', 'turn_ends_at' => '0']);
            } else {
                $sec = (int)$cfg['turn_sec'];
                setConfig($db, [
                    'turn_index' => (string)$nextIndex,
                    'turn_ends_at' => (string)($now + $sec)
                ]);
            }
            $cfg = getConfig($db);
        }
        break;

    case 'vote':
        if ($cfg['status'] !== 'voting' || !$me) break;
        $targetId = $input['target_id'] ?? '';
        $currentRound = (int)$cfg['current_round'];
        $maxRounds = (int)$cfg['max_rounds'];

        if ($targetId === 'pass' && $currentRound >= $maxRounds) {
            echo json_encode(['error' => 'En la última ronda no se puede pasar']);
            exit;
        }
        if ($targetId !== '') {
            $db->prepare("INSERT OR REPLACE INTO votes (voter_id, target_id) VALUES (?, ?)")
               ->execute([$playerId, $targetId]);
        }

        $totalPlayers = (int)$db->query("SELECT COUNT(*) FROM players")->fetchColumn();
        $totalVotes = (int)$db->query("SELECT COUNT(*) FROM votes")->fetchColumn();

        if ($totalVotes >= $totalPlayers && $totalPlayers > 0) {
            evaluateVotes($db, $cfg);
            $cfg = getConfig($db);
        }
        break;

    case 'force_evaluate':
        if (!$isHost) { echo json_encode(['error' => 'No autorizado']); exit; }
        if ($cfg['status'] === 'voting') {
            evaluateVotes($db, $cfg);
            $cfg = getConfig($db);
        }
        break;

    case 'next_round':
        if (!$isHost) { echo json_encode(['error' => 'No autorizado']); exit; }
        $nextRound = (int)$cfg['current_round'] + 1;
        startQuestionRound($db, $nextRound, $cfg);
        $cfg = getConfig($db);
        break;

    case 'end_game':
        if (!$isHost) { echo json_encode(['error' => 'No autorizado']); exit; }
        $db->exec("DELETE FROM votes");
        $db->exec("UPDATE players SET eliminated = 0");
        setConfig($db, [
            'status' => 'lobby',
            'current_round' => '1',
            'current_place' => '',
            'spy_id' => '',
            'turn_order' => '[]',
            'turn_index' => '0',
            'turn_ends_at' => '0',
            'last_event' => ''
        ]);
        $cfg = getConfig($db);
        break;

    case 'save_settings':
        if (!$isHost) { echo json_encode(['error' => 'No autorizado']); exit; }
        $maxR = max(1, min(10, (int)($input['max_rounds'] ?? 3)));
        $firstSec = max(3, min(120, (int)($input['first_turn_sec'] ?? 20)));
        $turnSec = max(2, min(120, (int)($input['turn_sec'] ?? 10)));
        $updates = [
            'max_rounds' => (string)$maxR,
            'first_turn_sec' => (string)$firstSec,
            'turn_sec' => (string)$turnSec
        ];
        if (!empty($input['new_host_pass'])) {
            $updates['host_pass'] = trim($input['new_host_pass']);
        }
        setConfig($db, $updates);
        $cfg = getConfig($db);
        break;

    case 'add_place':
        if (!$isHost) { echo json_encode(['error' => 'No autorizado']); exit; }
        $pName = trim($input['place_name'] ?? '');
        if ($pName !== '') {
            $db->prepare("INSERT OR IGNORE INTO places (name) VALUES (?)")->execute([$pName]);
        }
        break;

    case 'delete_place':
        if (!$isHost) { echo json_encode(['error' => 'No autorizado']); exit; }
        $pId = (int)($input['place_id'] ?? 0);
        $db->prepare("DELETE FROM places WHERE id = ?")->execute([$pId]);
        $db->prepare("DELETE FROM used_places WHERE place_id = ?")->execute([$pId]);
        break;

    case 'reset_used_places':
        if (!$isHost) { echo json_encode(['error' => 'No autorizado']); exit; }
        $db->exec("DELETE FROM used_places");
        break;

    case 'toggle_used_place':
        if (!$isHost) { echo json_encode(['error' => 'No autorizado']); exit; }
        $pId = (int)($input['place_id'] ?? 0);
        $exists = (int)$db->query("SELECT COUNT(*) FROM used_places WHERE place_id = $pId")->fetchColumn();
        if ($exists > 0) {
            $db->prepare("DELETE FROM used_places WHERE place_id = ?")->execute([$pId]);
        } else {
            $db->prepare("INSERT OR IGNORE INTO used_places (place_id) VALUES (?)")->execute([$pId]);
        }
        break;
}

$players = $db->query("SELECT id, name, avatar, is_host, last_seen, eliminated FROM players ORDER BY rowid ASC")->fetchAll();
$votesRows = $db->query("SELECT voter_id, target_id FROM votes")->fetchAll();
$votedIds = array_column($votesRows, 'voter_id');
$votesMap = [];
foreach ($votesRows as $vr) {
    $votesMap[$vr['voter_id']] = $vr['target_id'];
}

$myVote = null;
foreach ($votesRows as $vr) {
    if ($vr['voter_id'] === $playerId) $myVote = $vr['target_id'];
}

$totalCount = count($players);
$threshold = max(1, (int)ceil($totalCount / 3));

$amISpy = ($playerId !== '' && $cfg['spy_id'] === $playerId);
$visiblePlace = null;
if ($cfg['status'] === 'game_over') {
    $visiblePlace = $cfg['current_place'];
} elseif ($playerId !== '' && !$amISpy) {
    $visiblePlace = $cfg['current_place'];
}

$response = [
    'server_time' => $now,
    'me' => $me,
    'status' => $cfg['status'],
    'current_round' => (int)$cfg['current_round'],
    'max_rounds' => (int)$cfg['max_rounds'],
    'first_turn_sec' => (int)$cfg['first_turn_sec'],
    'turn_sec' => (int)$cfg['turn_sec'],
    'turn_order' => json_decode($cfg['turn_order'], true) ?: [],
    'turn_index' => (int)$cfg['turn_index'],
    'turn_ends_at' => (int)$cfg['turn_ends_at'],
    'seconds_left' => max(0, (int)$cfg['turn_ends_at'] - $now),
    'players' => $players,
    'voted_player_ids' => $votedIds,
    'votes_map' => $votesMap,
    'my_vote' => $myVote,
    'majority_threshold' => $threshold,
    'role' => $amISpy ? 'spy' : 'agent',
    'place' => $visiblePlace,
    'last_event' => $cfg['last_event'] ? json_decode($cfg['last_event'], true) : null
];

if ($isHost) {
    $response['places'] = $db->query("
        SELECT p.id, p.name, CASE WHEN u.place_id IS NOT NULL THEN 1 ELSE 0 END AS used
        FROM places p
        LEFT JOIN used_places u ON p.id = u.place_id
        ORDER BY p.name ASC
    ")->fetchAll();
}

echo json_encode($response);
