if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
    const locationElement = document.getElementById('location');
    const dateElement = document.getElementById('date');
    const fajrTimeElement = document.getElementById('fajr-time');
    const dhuhrTimeElement = document.getElementById('dhuhr-time');
    const asrTimeElement = document.getElementById('asr-time');
    const maghribTimeElement = document.getElementById('maghrib-time');
    const ishaTimeElement = document.getElementById('isha-time');

    const currentPrayerNameElement = document.getElementById('current-prayer-name');
    const currentPrayerTimeElement = document.getElementById('current-prayer-time');
    const countdownElement = document.getElementById('countdown');

    const prayerTimesMap = {
        Fajr: fajrTimeElement,
        Dhuhr: dhuhrTimeElement,
        Asr: asrTimeElement,
        Maghrib: maghribTimeElement,
        Isha: ishaTimeElement,
    };

    const prayerNamesIndonesian = {
        Fajr: 'Subuh',
        Dhuhr: 'Dzuhur',
        Asr: 'Ashar',
        Maghrib: 'Maghrib',
        Isha: 'Isya'
    };

    function getLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(showPosition, showError);
        } else {
            locationElement.textContent = "Geolocation tidak didukung oleh browser ini.";
        }
    }

    function showPosition(position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        getPrayerTimes(latitude, longitude);
        getCityName(latitude, longitude);
    }

    function showError(error) {
        let errorMessage = "Terjadi kesalahan.";
        switch (error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = "Pengguna menolak permintaan Geolocation.";
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = "Informasi lokasi tidak tersedia.";
                break;
            case error.TIMEOUT:
                errorMessage = "Waktu permintaan lokasi habis.";
                break;
            case error.UNKNOWN_ERROR:
                errorMessage = "Terjadi kesalahan yang tidak diketahui.";
                break;
        }
        locationElement.textContent = errorMessage;
    }

    async function getPrayerTimes(latitude, longitude) {
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();

        try {
            const response = await fetch(`http://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${latitude}&longitude=${longitude}&method=2`);
            if (!response.ok) {
                throw new Error('Gagal mengambil data waktu sholat.');
            }
            const data = await response.json();
            const timings = data.data.timings;

            displayPrayerTimes(timings);
            startCountdown(timings);

        } catch (error) {
            console.error("Error fetching prayer times:", error);
            locationElement.textContent = "Gagal memuat waktu sholat.";
        }
    }

    async function getCityName(latitude, longitude) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            if (!response.ok) {
                throw new Error('Gagal mengambil nama kota.');
            }
            const data = await response.json();
            const city = data.address.city || data.address.town || data.address.village || 'Lokasi Anda';
            locationElement.textContent = city;
        } catch (error) {
            console.error("Error fetching city name:", error);
            locationElement.textContent = "Lokasi Tidak Dikenal";
        }
    }


    function displayPrayerTimes(timings) {
        const today = new Date();
        dateElement.textContent = today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        for (const prayer in prayerTimesMap) {
            if (timings[prayer]) {
                prayerTimesMap[prayer].textContent = timings[prayer];
            }
        }
    }

    function startCountdown(timings) {
        setInterval(() => {
            const now = new Date();
            let nextPrayerName = null;
            let nextPrayerTime = null;

            const prayerSchedule = [
                { name: 'Fajr', time: timings.Fajr },
                { name: 'Dhuhr', time: timings.Dhuhr },
                { name: 'Asr', time: timings.Asr },
                { name: 'Maghrib', time: timings.Maghrib },
                { name: 'Isha', time: timings.Isha }
            ];

            for (const prayer of prayerSchedule) {
                const prayerDateTime = new Date(now.toDateString() + ' ' + prayer.time);
                if (prayerDateTime > now) {
                    nextPrayerName = prayer.name;
                    nextPrayerTime = prayerDateTime;
                    break;
                }
            }

            if (!nextPrayerName) {
                nextPrayerName = 'Fajr';
                const tomorrow = new Date(now);
                tomorrow.setDate(now.getDate() + 1);
                nextPrayerTime = new Date(tomorrow.toDateString() + ' ' + timings.Fajr);
            }

            const timeDiff = nextPrayerTime - now;
            const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

            currentPrayerNameElement.textContent = prayerNamesIndonesian[nextPrayerName];
            currentPrayerTimeElement.textContent = timings[nextPrayerName];
            countdownElement.textContent = `-${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            // Basic notification logic
            if (hours === 0 && minutes === 0 && seconds === 0) {
                 showNotification(nextPrayerName);
            }

        }, 1000);
    }

    function showNotification(prayerName) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('Waktunya Sholat!', {
                    body: `Saatnya menunaikan sholat ${prayerNamesIndonesian[prayerName]}.`,
                    icon: 'icon.png' // Anda perlu menambahkan ikon ini
                });
            }
        });
    }


    getLocation();
});
