import * as React from "react";
import Container from "@mui/material/Container";
import {
  Box,
  Card,
  Typography,
  Hidden,
  ButtonBase,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Divider,
  Link,
  Button,
  Alert,
  AlertTitle,
  CircularProgress,
  Backdrop,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import Grid from "@mui/material/Grid";
import { makeStyles } from "@mui/styles";
import axios from "axios";
import MuiAlert from "@mui/material/Alert";
import format from "date-fns/format";
import getTime from "date-fns/getTime";

const AlertSnack = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

// import GoogleSpreadsheet from "google-spreadsheet";

export default function App() {
  const [periode, setPeriode] = React.useState("");
  const [checkin, setCheckin] = React.useState("");
  const [kodeAbsensi, setKodeAbsensi] = React.useState("");
  const [latitude, setLatitude] = React.useState(null);
  const [longitude, setLongitude] = React.useState(null);
  const [alertType, setAlertType] = React.useState("");
  const [alertMsg, setAlertMsg] = React.useState(null);
  const [address, setAddress] = React.useState("");
  const [isLoading, setLoading] = React.useState(false);
  const [endPeriod, setEndPeriod] = React.useState(false);  

  const AbsensiComponent = () => {
    const [kodeAbsensi, setKodeAbsensi] = React.useState('')
  };

  React.useEffect(() => {
    
    const urlParams = new URLSearchParams(window.location.search);
    const kodeAbsensiFromUrl = urlParams.get('value'); // Ambil parameter `value` dari URL

    if (kodeAbsensiFromUrl) {
      setKodeAbsensi(kodeAbsensiFromUrl); // Set `kodeAbsensi` dengan nilai dari URL
    }
  },[]);
  React.useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
        },
        (error) => {
          setAlertType("error");
          setAlertMsg(
            <React.Fragment>
              Untuk Dapat Melakukan Absensi,<br/>
              Anda Harus Mengizinkan <strong>AKSES LOKASI </strong>
          </React.Fragment>
          );
          console.log("Error getting geolocation:", error);
        }
      );
    } else {
      setAlertType("warning");
      setAlertMsg(`Browser Anda tidak mendukung untuk mendapatkan lokasi`);
      console.log("Geolocation is not supported by this browser.");
    }
  }, []);
  React.useEffect(() => {
    const fetchAddress = async () => {
      try {
        const response = await axios.get(
          `https://nominatim.openstreetmap.org/reverse`,
          {
            params: {
              format: "json",
              lat: latitude,
              lon: longitude,
            },
          }
        );
        if (response.status === 200) {
          const formattedAddress = response.data.display_name;
          setAddress(formattedAddress);
        } else {
          setAddress("Error fetching address");
        }
      } catch (error) {
        setAddress("Error fetching address");
        console.log("Error fetching address:", error);
      }
    };

    if (latitude && longitude) {
      fetchAddress();
    }
  }, [latitude, longitude]);
  const handleChange = (event) => {
    setPeriode(event.target.value);
  };
  const handleCheckin = (event) => {
    setCheckin(event.target.value);
  };
  const handleSubmit = async () => {
    setLoading(true);
    const { GoogleSpreadsheet } = require("google-spreadsheet");
    const creds = require("./local-scope-390206-31c34a712574.json"); // the file saved above
    const doc = new GoogleSpreadsheet(
      "1VzlUIoeDuyvpkrt9ANnKJyuzE7iFXlrqlclhspvJfY0"
    );
    await doc.useServiceAccountAuth(creds);

    await doc.loadInfo(); // loads document properties and worksheets
    const sheet = doc.sheetsByIndex[0];
    const sheet2 = doc.sheetsByIndex[1];
    const rows = await sheet2.getRows();
    const temp = rows.filter(
      (row) =>
        row["KODE ABSENSI"] === kodeAbsensi && row["PERTEMUAN"] === periode
    ); //filter by kode absensi
    let data = {};
    if (temp.length > 0 && latitude && longitude) {
      //check kodeabsensi exist
      // KOLOM HARUS SESUAI DENGAN SPREADSHEET
      data = {
        "PRIMARY KEY": getTime(new Date()),
        NIS: temp[0]["NIS"],
        "NAMA SISWA": temp[0]["NAMA SISWA"],
        PERTEMUAN: temp[0]["PERTEMUAN"],
        "NAMA PENGAJAR": temp[0]["NAMA PENGAJAR"],
        PERIODE: temp[0]["PERIODE"],
        TANGGAL: format(new Date(), "dd/MM/yyyy HH:mm"),
        ABSEN: checkin,
        KOORDINAT: `${latitude}, ${longitude}`,
        LOKASI: address,
      };
      // Insert the data as a new row
      try {
        await sheet.addRow(data);
        clearState();
        setAlertType("success");
        if (
          temp[0]["PERTEMUAN"] === "Pertemuan ke - 8" &&
          checkin === "KELUAR"
        ) {
          setEndPeriod(true);
          setAlertMsg(
            <div style={{ whiteSpace: 'pre-line' }}>
              Selamat, <span style={{ fontWeight: 'bold' }}>{temp[0]["NAMA PENGAJAR"]} !</span>{"\n"}
              Anda Menyelesaikan <span style={{ fontWeight: 'bold' }}>SESI TERAKHIR</span>{"\n"}
            </div>
          );
        } else {
          setAlertMsg(
            <div style={{ whiteSpace: 'pre-line' }}>
              Terimakasih Kak, {"\n"}
              <span style={{ fontWeight: 'bold' }}>{temp[0]["NAMA PENGAJAR"]}</span>{"\n"}
              Anda Berhasil Melakukan Absen !
            </div>
          );
        }
      } catch (e) {
        clearState();
        setAlertType("error");
        setAlertMsg(`ERROR: ${e.message}`);
      }
    } else {
      clearState();
      setAlertType("warning");
      setAlertMsg(
        <div style={{ whiteSpace: 'pre-line' }}>
          <span style={{ fontWeight: 'bold' }}>GAGAL MELAKUKAN ABSENSI !</span>{"\n"}
          1. Kode Absen & Pertemuan Tidak Cocok !{"\n"}
          2. Izinkan Akses Lokasi Pada Browser Anda
        </div>
      );
    }
  };
  const clearState = () => {
    setPeriode("");
    setCheckin("");
    setKodeAbsensi("");
    setAlertType("");
    setAlertMsg("");
    setLoading(false);
  };
  const closeBackdrop = () => {
    setLoading(false);
  };
  const handleAlert = (event, reason) => {
    setAlertMsg(null);
    setEndPeriod(false);
  };
  const useStyles = makeStyles({
    typography: {
      position: "absolute",
      top: "50%",
      left: "50%",
      color: "white",
      fontWeight: "bold",
      textAlign: "center",
    },
    media: {
      backgroundColor: "rgba(0, 0, 0, 0.5)", // Transparent black overlay
    },
    overlay: {
      position: "absolute",
      top: "50%",
      left: "53%",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      display: "flex",
      color: "white",
      fontWeight: "bold",
    },
  });
  const ImageButton = styled(ButtonBase)(({ theme }) => ({
    position: "relative",
    height: 200,
    [theme.breakpoints.down("sm")]: {
      width: "100% !important", // Overrides inline-style
      height: 100,
    },
    "&:hover, &.Mui-focusVisible": {
      zIndex: 1,
      "& .MuiImageBackdrop-root": {
        opacity: 0.15,
      },
      "& .MuiImageMarked-root": {
        opacity: 0,
      },
    },
  }));

  const ImageSrc = styled("span")({
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundSize: "cover",
    backgroundPosition: "center 40%",
  });

  const Image = styled("span")(({ theme }) => ({
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: theme.palette.common.white,
  }));

  const ImageBackdrop = styled("span")(({ theme }) => ({
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: theme.palette.common.black,
    opacity: 0.4,
    transition: theme.transitions.create("opacity"),
  }));

  const ImageMarked = styled("span")(({ theme }) => ({
    height: 3,
    width: 18,
    backgroundColor: theme.palette.common.white,
    position: "absolute",
    bottom: -2,
    left: "calc(50% - 9px)",
    transition: theme.transitions.create("opacity"),
  }));
  const classes = useStyles();
  return (
    <Container maxWidth="md">
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={isLoading}
        onClick={closeBackdrop}
      >
        <CircularProgress color="success" />
      </Backdrop>
      <Box sx={{ my: 4 }}>
        <Card>
          <Grid container columns={{ xs: 6, md: 12 }}>
            <Grid item xs={6} md={6} sx={{ p: 2 }}>
              <div
                style={{
                  margin: 25,
                  border: 1,
                  flex: 1,
                  textAlign: "center",
                  fontFamily: "Poppins",
                  fontWeight: "bold",
                  fontSize: "1.5rem",
                  marginBottom: "0%",
                }}
              >
                <img
                  style={{
                    height: 60,
                    width: 270,
                  }}
                  src="https://persistence.co.id/persistence-baru-2.png"
                />
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{ mt: 2, fontWeight: "500",marginBottom: 5 }}
                >
                  ABSENSI PENGAJAR
                </Typography>
              </div>
              <div style={{ marginBottom: 20 }}>
                <TextField
                  required
                  id="outlined-required"
                  label="Kode Absensi"
                  placeholder="Masukkan Kode Absensi"
                  style={{ width: "100%" }}
                  value={kodeAbsensi}
                  onChange={(e) => setKodeAbsensi(e.target.value)}
                />
                <FormControl style={{ width: "100%", marginTop: 20 }}>
                  <InputLabel id="pertemuan-select">
                    {" "}
                    -- Pilih Pertemuan --
                  </InputLabel>
                  <Select
                    labelId="select-label"
                    id="pertemuan-select"
                    value={periode}
                    label="Pilih Pertemuan"
                    onChange={handleChange}
                  >
                    <MenuItem value={"Pertemuan ke - 1"}>
                      Pertemuan ke - 1
                    </MenuItem>
                    <MenuItem value={"Pertemuan ke - 2"}>
                      Pertemuan ke - 2
                    </MenuItem>
                    <MenuItem value={"Pertemuan ke - 3"}>
                      Pertemuan ke - 3
                    </MenuItem>
                    <MenuItem value={"Pertemuan ke - 4"}>
                      Pertemuan ke - 4
                    </MenuItem>
                    <MenuItem value={"Pertemuan ke - 5"}>
                      Pertemuan ke - 5
                    </MenuItem>
                    <MenuItem value={"Pertemuan ke - 6"}>
                      Pertemuan ke - 6
                    </MenuItem>
                    <MenuItem value={"Pertemuan ke - 7"}>
                      Pertemuan ke - 7
                    </MenuItem>
                    <MenuItem value={"Pertemuan ke - 8"}>
                      Pertemuan ke - 8
                    </MenuItem>
                  </Select>
                </FormControl>
                <FormControl style={{ width: "100%", marginTop: 20 }}>
                  <InputLabel id="checkin-select">
                    -- Pilih Absen ---
                  </InputLabel>
                  <Select
                    labelId="select-label"
                    id="checkin-select"
                    value={checkin}
                    label="-- Pilih Absen --"
                    onChange={handleCheckin}
                  >
                    <MenuItem value={"MASUK"}>Masuk</MenuItem>
                    <MenuItem value={"KELUAR"}>Keluar</MenuItem>
                  </Select>
                </FormControl>
              </div>
              <Divider style={{ width: "100%", marginBottom: "10%" }} />
              {!!alertMsg && (
                <Alert
                  severity={alertType}
                  onClose={handleAlert}
                  sx={{ marginBottom: 3 }}
                >
                  <AlertTitle>Perhatian</AlertTitle>
                  {alertMsg} <span />
                  {!!endPeriod && (
                    <Link
                      href="http://wa.me/6281274494313?text=EMERGENCY1.1(END PERIODE)"
                      underline="none"
                      fontSize={14}
                      fontWeight={600}
                      color={"#4687ff"}
                    >
                      SEGERA HUBUNGI ADMIN !
                    </Link>
                  )}
                </Alert>
              )}
              <Link
                href="http://wa.me/6281274494313?text=EMERGENCY1.1%20(LUPA ABSEN)"
                underline="none"
                fontSize={14}
                fontWeight={600}
                color={"#4687ff"}
              >
                Lupa Kode Absen ?
              </Link>
              <Button
                variant="contained"
                style={{
                  width: "96%",
                  backgroundColor: "#1ab69d",
                  marginTop: 40,
                }}
                size="large"
                onClick={handleSubmit}
              >
                Submit
              </Button>
              <Grid
                item
                sx={{
                  flex: 1,
                  flexDirection: "row",
                  textAlign: "center",
                  marginTop: 3,
                }}
              >
                <Typography
                  sx={{ fontSize: 14, fontWeight: "500", color: "#333" }}
                >
                  Belum terdaftar ? <span />
                  <Link
                    href="http://wa.me/6281220204070?text=EMERGENCY1.1%20(BPENDAFTARAN PENGAJAR)"
                    underline="none"
                    fontSize={14}
                    fontWeight={600}
                    color={"#4687ff"}
                  >
                    Hubungi Admin !
                  </Link>
                </Typography>
              </Grid>
            </Grid>
            <Grid item xs={6} md={6}>
              <Hidden mdDown>
                {/* Content to hide on screens smaller than 730px */}
                {/* <CardMedia
                  className={classes.media}
                  sx={{ height: 700, width: 425 }}
                  image="https://www.smadwiwarna.sch.id/wp-content/uploads/2018/02/Cara-Belajar-Yang-Efektif-scaled.jpg"
                />
                <Typography variant="h5" className={classes.overlay}>
                  <span class="text-1" style={{ textAlign: "center" }}>
                    Milikilah tujuan untuk sukses <br />
                    bukan kesempurnaan.
                  </span>
                  <span class="text-2">Let's get connected</span>
                </Typography> */}
                <ImageButton
                  focusRipple
                  // key={image.title}
                  style={{
                    height: 760,
                    width: 430,
                  }}
                >
                  <ImageSrc
                    style={{
                      backgroundImage: `url(https://persistence.co.id/animasi.gif)`,
                      height: 550,
                      left: -17,
                      width: '100%',
                      backgroundSize: '115% auto',
                    }}
                  />
                  <ImageBackdrop className="MuiImageBackdrop-root" />
                  <Image>
                    <Typography
                      component="span"
                      variant="h5"
                      color="inherit"
                      sx={{
                        position: "relative",
                        left: -20,
                        bottom: -190,
                        pt: 2,
                        pb: (theme) => `calc(${theme.spacing(1)} + 6px)`,
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>
                        Milikilah tujuan untuk sukses <br/>
                        bukan kesempurnaan.
                      </span>
                      <br></br>
                      <br/>
                      <span>"Do With Persistence"</span>
                      <ImageMarked className="MuiImageMarked-root" />
                    </Typography>
                  </Image>
                </ImageButton>
              </Hidden>
            </Grid>
          </Grid>
        </Card>
      </Box>
    </Container>
  );
}
