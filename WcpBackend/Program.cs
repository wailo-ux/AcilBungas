using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddControllers();


builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()   // Boleh diakses dari IP/Port mana saja
              .AllowAnyMethod()   // Boleh pakai metode GET, POST, PUT, DELETE
              .AllowAnyHeader();  // Boleh kirim header apa saja
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "WCP 4 API v1");
    // Mengubah rute utama. Jika Anda buka localhost:8888, langsung muncul Swagger
    c.RoutePrefix = string.Empty; 
});

app.UseCors("AllowAll");

app.UseAuthorization();

app.MapControllers();

app.Run();