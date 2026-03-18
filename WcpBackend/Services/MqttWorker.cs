using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using MQTTnet;
using MQTTnet.Client;
using WcpBackend.Data;
using WcpBackend.Models;

namespace WcpBackend.Services
{
    public class MqttWorker : BackgroundService
    {
        private readonly IMqttClient _mqttClient;
        private readonly IServiceScopeFactory _scopeFactory;
        private bool _isOfflineAlerted = false;
        private bool _isTankAlerted = false;
        private int _lastRainSession = 0;

        public MqttWorker(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
            var factory = new MqttFactory();
            _mqttClient = factory.CreateMqttClient();
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var options = new MqttClientOptionsBuilder()
                .WithTcpServer("localhost", 1883)
                .WithClientId($"AspNetServer-{Guid.NewGuid()}")
                .Build();

            // 1. EVENT: Saat menerima pesan dari MQTT
            _mqttClient.ApplicationMessageReceivedAsync += async e =>
            {
                var topic = e.ApplicationMessage.Topic;
                var payload = e.ApplicationMessage.ConvertPayloadToString();

                // Logika Status ESP32 Offline/Online
                if (topic == "TOP/SHE/WCP4/status")
                {
                    if (payload == "offline" && !_isOfflineAlerted)
                    {
                        await SendTelegramAlert("*WCP 4 ALERT: ESP32 OFFLINE!*\n\nKoneksi sistem ke panel kontrol terputus.");
                        _isOfflineAlerted = true;
                    }
                    else if (payload == "online" && _isOfflineAlerted)
                    {
                        await SendTelegramAlert("*WCP 4 INFO: ESP32 ONLINE*\n\nKoneksi jaringan ke panel kontrol telah pulih.");
                        _isOfflineAlerted = false;
                    }
                }
                
                // Logika Data Sensor Dosing & Hujan
                if (topic == "TOP/SHE/WCP4/data")
                {
                    try
                    {
                        var data = JsonSerializer.Deserialize<JsonElement>(payload);

                        // Ambil variabel dengan aman (menghindari error jika properti tidak ada di JSON)
                        bool saveLog = data.TryGetProperty("save_log", out var sl) && 
                                      (sl.ValueKind == JsonValueKind.True || (sl.ValueKind == JsonValueKind.Number && sl.GetInt32() == 1));
                        
                        int logId = data.TryGetProperty("log_id", out var li) ? li.GetInt32() : 0;

                        // A. Simpan ke Database
                        if (saveLog && logId != _lastRainSession)
                        {
                            _lastRainSession = logId;
                            var now = DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss");

                            using var scope = _scopeFactory.CreateScope();
                            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                            var newLog = new RainLog
                            {
                                WaktuMulai = data.TryGetProperty("waktu_mulai", out var wm) && wm.ValueKind != JsonValueKind.Null ? wm.GetString() : now,
                                WaktuSelesai = now,
                                DurasiMenit = data.TryGetProperty("durasi", out var d) ? d.GetInt32() : 0,
                                TotalHujan = data.TryGetProperty("total_hujan", out var th) ? th.GetDouble() : 0
                            };

                            db.RainLogs.Add(newLog);
                            await db.SaveChangesAsync();
                            Console.WriteLine("Log hujan disimpan ke SQL Server.");
                        }

                        // B. Peringatan Tangki Utama (Mendeteksi false atau 0)
                        bool isMain10Empty = false;
                        if (data.TryGetProperty("main_10", out var m10))
                        {
                            if (m10.ValueKind == JsonValueKind.False) isMain10Empty = true;
                            else if (m10.ValueKind == JsonValueKind.Number && m10.GetInt32() == 0) isMain10Empty = true;
                        }

                        if (isMain10Empty)
                        {
                            if (!_isTankAlerted)
                            {
                                await SendTelegramAlert("*WCP 4 WARNING: TANGKI KRITIS!*\n\nVolume Tangki Utama (1200L) kosong.");
                                _isTankAlerted = true;
                            }
                        }
                        else
                        {
                            _isTankAlerted = false;
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Format MQTT Error: {ex.Message}");
                    }
                }
            };

            // 2. EVENT: Auto-Reconnect jika Mosquitto mati/restart
            _mqttClient.DisconnectedAsync += async e =>
            {
                Console.WriteLine("Terputus dari MQTT Broker. Mencoba koneksi ulang dalam 5 detik...");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                try { await _mqttClient.ConnectAsync(options, stoppingToken); } catch { }
            };

            // 3. KONEKSI AWAL & SUBSCRIBE
            try
            {
                await _mqttClient.ConnectAsync(options, stoppingToken);

                // Cara Subscribe untuk MQTTnet v4
                var factory = new MqttFactory();
                
                var subscribeOptions1 = factory.CreateSubscribeOptionsBuilder()
                    .WithTopicFilter(f => f.WithTopic("TOP/SHE/WCP4/status"))
                    .Build();
                await _mqttClient.SubscribeAsync(subscribeOptions1, stoppingToken);

                var subscribeOptions2 = factory.CreateSubscribeOptionsBuilder()
                    .WithTopicFilter(f => f.WithTopic("TOP/SHE/WCP4/data"))
                    .Build();
                await _mqttClient.SubscribeAsync(subscribeOptions2, stoppingToken);

                Console.WriteLine("ASP.NET terhubung ke Local MQTT Broker (Port 1883)");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Gagal terhubung ke MQTT Broker saat startup: {ex.Message}");
            }

            // Menjaga Background Service tetap hidup
            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(1000, stoppingToken);
            }
        }

        private async Task SendTelegramAlert(string message)
        {
            string botToken = "GANTI_DENGAN_TOKEN_BOTFATHER"; // Ganti token Anda
            string chatId = "GANTI_DENGAN_CHAT_ID_GRUP";      // Ganti Chat ID Anda

            if (botToken == "GANTI_DENGAN_TOKEN_BOTFATHER") return;

            using var httpClient = new HttpClient();
            var url = $"https://api.telegram.org/bot{botToken}/sendMessage";
            var payload = new { chat_id = chatId, text = message, parse_mode = "Markdown" };
            
            try 
            {
                await httpClient.PostAsJsonAsync(url, payload);
            } 
            catch (Exception e) 
            { 
                Console.WriteLine($"Gagal kirim Telegram: {e.Message}"); 
            }
        }
    }
}