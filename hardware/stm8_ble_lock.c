/*
 * ============================================================================
 * Karunya Cycle Rental System — STM8S103F3P6 BLE Lock Controller
 * ============================================================================
 *
 * Microcontroller: STM8S103F3P6
 * BLE Module:      HM-10 / JDY-08 (connected via UART1 at 9600 baud)
 * Relay Pin:       PB5 (PB_ODR bit 5)
 *
 * Protocol:
 *   The React Native app sends a 5-character string over BLE UART:
 *     - Bytes 0-3: 4-digit Auth PIN (ASCII digits, e.g., "1234")
 *     - Byte 4:    Command character
 *                    'U' = Unlock (relay ON  / PB5 HIGH)
 *                    'L' = Lock   (relay OFF / PB5 LOW)
 *
 *   Response (sent back over UART → BLE notification):
 *     "OK\n"  — command accepted and executed
 *     "ERR\n" — invalid PIN or malformed command
 *
 * Build with SDCC:
 *   sdcc -mstm8 --std-sdcc99 -lstm8 stm8_ble_lock.c
 *
 * ============================================================================
 */

#include <stdint.h>

/* ---- Register Definitions (STM8S103F3P6) ---- */

/* Clock */
#define CLK_CKDIVR   (*(volatile uint8_t *)0x50C6)

/* Port B */
#define PB_ODR       (*(volatile uint8_t *)0x5005)
#define PB_DDR       (*(volatile uint8_t *)0x5007)
#define PB_CR1       (*(volatile uint8_t *)0x5008)

/* UART1 */
#define UART1_SR     (*(volatile uint8_t *)0x5230)
#define UART1_DR     (*(volatile uint8_t *)0x5231)
#define UART1_BRR1   (*(volatile uint8_t *)0x5232)
#define UART1_BRR2   (*(volatile uint8_t *)0x5233)
#define UART1_CR2    (*(volatile uint8_t *)0x5235)

/* UART1_SR bit masks */
#define UART1_SR_RXNE  (1 << 5)   /* Read Data Register Not Empty */
#define UART1_SR_TXE   (1 << 7)   /* Transmit Data Register Empty */

/* UART1_CR2 bit masks */
#define UART1_CR2_TEN  (1 << 3)   /* Transmitter Enable */
#define UART1_CR2_REN  (1 << 2)   /* Receiver Enable */

/* ---- Configuration ---- */

/*
 * AUTH_PIN: The 4-digit PIN that must precede every command.
 * Change this to match what is stored in Firestore for this lock.
 */
#define AUTH_PIN_0  '1'
#define AUTH_PIN_1  '2'
#define AUTH_PIN_2  '3'
#define AUTH_PIN_3  '4'

/* Relay is on PB5 */
#define RELAY_BIT   5

/* Command buffer length: 4 digits PIN + 1 command char */
#define CMD_LEN     5

/* ---- Function Prototypes ---- */

static void     clock_init(void);
static void     gpio_init(void);
static void     uart1_init(void);
static uint8_t  uart1_read(void);
static void     uart1_write(uint8_t data);
static void     uart1_print(const char *str);
static void     relay_on(void);
static void     relay_off(void);
static uint8_t  verify_pin(const uint8_t *buf);
static void     process_command(const uint8_t *buf);

/* ---- Main ---- */

void main(void)
{
    uint8_t cmd_buf[CMD_LEN];
    uint8_t idx = 0;

    clock_init();
    gpio_init();
    uart1_init();

    /* Start with relay OFF (locked) */
    relay_off();

    /* Send ready message */
    uart1_print("RDY\n");

    /* Main loop: accumulate bytes into cmd_buf, process when full */
    for (;;) {
        uint8_t ch = uart1_read();

        cmd_buf[idx] = ch;
        idx++;

        if (idx >= CMD_LEN) {
            process_command(cmd_buf);
            idx = 0;  /* Reset buffer for next command */
        }
    }
}

/* ---- Clock Initialization ---- */

/*
 * Set HSI prescaler to 1 → f_MASTER = 16 MHz.
 * Default out of reset is HSI/8 = 2 MHz; we want full speed for
 * accurate UART baud rate generation.
 */
static void clock_init(void)
{
    CLK_CKDIVR = 0x00;  /* HSI prescaler = 1, CPU prescaler = 1 */
}

/* ---- GPIO Initialization ---- */

/*
 * Configure PB5 as push-pull output for the relay.
 */
static void gpio_init(void)
{
    PB_DDR |= (1 << RELAY_BIT);   /* PB5 = output */
    PB_CR1 |= (1 << RELAY_BIT);   /* PB5 = push-pull */
}

/* ---- UART1 Initialization (9600 baud @ 16 MHz f_MASTER) ---- */

/*
 * Baud rate calculation:
 *   BRR = f_MASTER / baud = 16000000 / 9600 = 1666.67 ≈ 0x0683
 *   BRR1 = mantissa bits [11:4] = 0x68
 *   BRR2 = mantissa bits [15:12] | [3:0] = 0x03
 *
 * Note: BRR2 must be written BEFORE BRR1 (STM8 hardware requirement).
 */
static void uart1_init(void)
{
    UART1_BRR2 = 0x03;       /* Must write BRR2 first */
    UART1_BRR1 = 0x68;       /* 9600 baud @ 16 MHz */
    UART1_CR2  = UART1_CR2_TEN | UART1_CR2_REN;  /* Enable TX and RX */
}

/* ---- UART1 Blocking Read ---- */

static uint8_t uart1_read(void)
{
    while (!(UART1_SR & UART1_SR_RXNE)) {
        /* Wait for data */
    }
    return UART1_DR;
}

/* ---- UART1 Blocking Write ---- */

static void uart1_write(uint8_t data)
{
    while (!(UART1_SR & UART1_SR_TXE)) {
        /* Wait for TX register to be empty */
    }
    UART1_DR = data;
}

/* ---- UART1 Print String ---- */

static void uart1_print(const char *str)
{
    while (*str) {
        uart1_write((uint8_t)*str);
        str++;
    }
}

/* ---- Relay Control ---- */

static void relay_on(void)
{
    PB_ODR |= (1 << RELAY_BIT);   /* PB5 HIGH → relay ON → unlock */
}

static void relay_off(void)
{
    PB_ODR &= ~(1 << RELAY_BIT);  /* PB5 LOW → relay OFF → lock */
}

/* ---- PIN Verification ---- */

/*
 * Compare the first 4 bytes of buf against the hardcoded AUTH_PIN.
 * Returns 1 if match, 0 otherwise.
 */
static uint8_t verify_pin(const uint8_t *buf)
{
    if (buf[0] == AUTH_PIN_0 &&
        buf[1] == AUTH_PIN_1 &&
        buf[2] == AUTH_PIN_2 &&
        buf[3] == AUTH_PIN_3) {
        return 1;
    }
    return 0;
}

/* ---- Command Processing ---- */

/*
 * buf[0..3] = PIN digits
 * buf[4]    = Command: 'U' (unlock) or 'L' (lock)
 *
 * Sends "OK\n" on success, "ERR\n" on failure.
 */
static void process_command(const uint8_t *buf)
{
    /* Step 1: Verify PIN */
    if (!verify_pin(buf)) {
        uart1_print("ERR\n");
        return;
    }

    /* Step 2: Execute command */
    switch (buf[4]) {
        case 'U':
        case 'u':
            relay_on();
            uart1_print("OK\n");
            break;

        case 'L':
        case 'l':
            relay_off();
            uart1_print("OK\n");
            break;

        default:
            /* Valid PIN but unknown command */
            uart1_print("ERR\n");
            break;
    }
}
