'use client';

import React, { useState, useEffect } from 'react';

// Definisikan tipe untuk data waktu sholat
interface PrayerTimes {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  [key: string]: string; // Indeks signature untuk akses dinamis
}

// Nama sholat dalam bahasa Indonesia
const prayerNamesIndonesian: { [key: string]: string } = {
  Fajr: 'Subuh',
  Dhuhr: 'Dzuhur',
  Asr: 'Ashar',
  Maghrib: 'Maghrib',
  Isha: 'Isya',
};

export default function HomePage() {
  const [location, setLocation] = useState('Mencari lokasi...');
  const [date, setDate] = useState('');
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [nextPrayer, setNextPrayer] = useState({
    name: '...',
    time: '...',
    countdown: '-:--:--',
  });

  useEffect(() => {
    // Fungsi untuk mendapatkan nama kota dari koordinat
    const getCityName = async (latitude: number, longitude: number) => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        if (!response.ok) throw new Error('Gagal mengambil nama kota.');
        const data = await response.json();
        const city = data.address.city || data.address.town || data.address.village || 'Lokasi Anda';
        setLocation(city);
      } catch (error) {
        console.error("Error fetching city name:", error);
        setLocation("Lokasi Tidak Dikenal");
      }
    };

    // Fungsi untuk mendapatkan waktu sholat
    const getPrayerTimes = async (latitude: number, longitude: number) => {
      const d = new Date();
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const day = d.getDate();

      try {
        const response = await fetch(`https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${latitude}&longitude=${longitude}&method=2`);
        if (!response.ok) throw new Error('Gagal mengambil data waktu sholat.');
        const data = await response.json();
        setPrayerTimes(data.data.timings);
      } catch (error) {
        console.error("Error fetching prayer times:", error);
        setLocation("Gagal memuat waktu sholat.");
      }
    };

    // Mendapatkan lokasi pengguna
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          getCityName(latitude, longitude);
          getPrayerTimes(latitude, longitude);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocation('Izin lokasi ditolak.');
        }
      );
    } else {
      setLocation("Geolocation tidak didukung.");
    }

    // Set tanggal saat ini
    setDate(new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }));
  }, []); // Jalankan sekali saat komponen dimuat

  useEffect(() => {
    if (!prayerTimes) return;

    const interval = setInterval(() => {
      const now = new Date();
      let nextPrayerName: string | null = null;
      let nextPrayerTime: Date | null = null;

      const prayerSchedule = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

      for (const prayer of prayerSchedule) {
        const prayerDateTime = new Date(`${now.toDateString()} ${prayerTimes[prayer]}`);
        if (prayerDateTime > now) {
          nextPrayerName = prayer;
          nextPrayerTime = prayerDateTime;
          break;
        }
      }

      if (!nextPrayerName) {
        nextPrayerName = 'Fajr';
        const tomorrow = new Date();
        tomorrow.setDate(now.getDate() + 1);
        nextPrayerTime = new Date(`${tomorrow.toDateString()} ${prayerTimes.Fajr}`);
      }

      const timeDiff = nextPrayerTime!.getTime() - now.getTime();
      const hours = String(Math.floor((timeDiff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
      const minutes = String(Math.floor((timeDiff / (1000 * 60)) % 60)).padStart(2, '0');
      const seconds = String(Math.floor((timeDiff / 1000) % 60)).padStart(2, '0');

      setNextPrayer({
        name: prayerNamesIndonesian[nextPrayerName],
        time: prayerTimes[nextPrayerName],
        countdown: `-${hours}:${minutes}:${seconds}`,
      });
    }, 1000);

    return () => clearInterval(interval); // Bersihkan interval saat komponen dilepas
  }, [prayerTimes]);

  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center font-sans p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden">
        <header className="bg-blue-600 text-white p-6 text-center">
          <h1 className="text-2xl font-bold">{location}</h1>
          <p className="text-sm opacity-90 mt-1">{date}</p>
        </header>

        <main className="p-6">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-blue-600">
              {nextPrayer.name}
            </h2>
            <p className="text-6xl font-bold my-2 text-gray-800">
              {nextPrayer.time}
            </p>
            <p className="text-lg text-gray-500">
              {nextPrayer.countdown}
            </p>
          </div>

          <div className="space-y-3">
            {prayerTimes ? (
              Object.entries({
                Subuh: prayerTimes.Fajr,
                Dzuhur: prayerTimes.Dhuhr,
                Ashar: prayerTimes.Asr,
                Maghrib: prayerTimes.Maghrib,
                Isya: prayerTimes.Isha,
              }).map(([name, time]) => (
                <div key={name} className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                  <span className="font-semibold text-gray-700">{name}</span>
                  <span className="font-bold text-gray-900">{time}</span>
                </div>
              ))
            ) : (
              // Tampilkan placeholder saat memuat
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg p-4 h-14 animate-pulse" />
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
