/**
 * STM8S103F3P6 + HC-05 Classic Bluetooth Lock Firmware
 * =====================================================
 * Karunya Cycle Rental System — Hardware Lock Controller
 *
 * HARDWARE:
 *   - MCU: STM8S103F3P6 (16 MHz HSI)
 *   - Bluetooth: HC-05 Classic Bluetooth module (SPP, UART 9600 baud)
 *   - Relay: Connected to PB5 (controls physical lock solenoid)
 *
 * WIRING:
 *   STM8 PA4 (UART1_RX) <--- HC-05 TXD
 *   STM8 PA5 (UART1_TX) ---> HC-05 RXD
 *   STM8 PB5            ---> Relay IN (active HIGH = unlock)
 *   All share common GND. HC-05 powered at 3.3–5V.
 *
 * PROTOCOL:
 *   All commands are ASCII strings received via UART from the HC-05.
 *   The HC-05 transparently bridges SPP (Bluetooth serial) to UART.
 *
 *   UNLOCK:     [4-digit PIN]U          (e.g. "1234U")  → 5 bytes
 *   LOCK:       [4-digit PIN]L          (e.g. "1234L")  → 5 bytes
 *   CHANGE PIN: [oldPIN]C[newPIN]       (e.g. "1234C5678") → 9 bytes
 *
 *   RESPONSES (sent back via UART → HC-05 → phone):
 *     "OK\n"  — command accepted and executed
 *     "ERR\n" — invalid PIN or malformed command
 *     "RDY\n" — sent on boot to indicate ready state
 *
 * PIN STORAGE:
 *   The PIN is stored in RAM (volatile). On power cycle, it resets to
 *   the compile-time default (AUTH_PIN_0..3). The app's "Two-Generals"
 *   fallback handles this by trying previousPin if currentPin fails.
 *
 * COMPILATION:
 *   sdcc -mstm8 stm8_bt_lock.c -o stm8_bt_lock.ihx
 *   stm8flash -c stlinkv2 -p stm8s103f3 -w stm8_bt_lock.ihx
 */

#include <stdint.h>

/* ---- STM8S103F3P6 Register Definitions ---- */
#define CLK_CKDIVR   (*(volatile uint8_t *)0x50C6)

#define PB_ODR       (*(volatile uint8_t *)0x5005)
#define PB_DDR       (*(volatile uint8_t *)0x5007)
#define PB_CR1       (*(volatile uint8_t *)0x5008)

#define UART1_SR     (*(volatile uint8_t *)0x5230)
#define UART1_DR     (*(volatile uint8_t *)0x5231)
#define UART1_BRR1   (*(volatile uint8_t *)0x5232)
#define UART1_BRR2   (*(volatile uint8_t *)0x5233)
#define UART1_CR2    (*(volatile uint8_t *)0x5235)

#define UART1_SR_RXNE  (1 << 5)
#define UART1_SR_TXE   (1 << 7)
#define UART1_CR2_TEN  (1 << 3)
#define UART1_CR2_REN  (1 << 2)

/* ---- Configuration ---- */
/* Default PIN — change this to match what you register in the app.
 * After first ride, the app will rotate the PIN via the 'C' command. */
#define DEFAULT_PIN_0  '1'
#define DEFAULT_PIN_1  '2'
#define DEFAULT_PIN_2  '3'
#define DEFAULT_PIN_3  '4'

#define RELAY_BIT   5  /* Relay on PB5 — HIGH = unlock, LOW = lock */

/* ---- Global State ---- */
/* PIN stored in RAM — survives rides but resets on power cycle */
static volatile uint8_t pin[4] = {
    DEFAULT_PIN_0, DEFAULT_PIN_1, DEFAULT_PIN_2, DEFAULT_PIN_3
};

/* ---- Peripheral Init ---- */
void clock_init(void) {
    CLK_CKDIVR = 0x00;  /* HSI / 1 = 16 MHz */
}

void gpio_init(void) {
    PB_DDR |= (1 << RELAY_BIT);   /* PB5 = output */
    PB_CR1 |= (1 << RELAY_BIT);   /* PB5 = push-pull */
}

void uart1_init(void) {
    /* 9600 baud @ 16 MHz: BRR = 16000000 / 9600 = 1667 = 0x0683 */
    UART1_BRR2 = 0x03;       /* BRR2 (nibbles: high[7:4]=0, frac[3:0]=3) */
    UART1_BRR1 = 0x68;       /* BRR1 (mantissa[11:4]) */
    UART1_CR2  = UART1_CR2_TEN | UART1_CR2_REN;  /* Enable TX and RX */
}

/* ---- UART Primitives ---- */
uint8_t uart1_read(void) {
    while (!(UART1_SR & UART1_SR_RXNE));
    return UART1_DR;
}

void uart1_write(uint8_t data) {
    while (!(UART1_SR & UART1_SR_TXE));
    UART1_DR = data;
}

void uart1_print(const char *str) {
    while (*str) {
        uart1_write((uint8_t)*str);
        str++;
    }
}

/* ---- Relay Control ---- */
void relay_on(void)  { PB_ODR |=  (1 << RELAY_BIT); }  /* Unlock */
void relay_off(void) { PB_ODR &= ~(1 << RELAY_BIT); }  /* Lock   */

/* ---- PIN Verification ---- */
uint8_t verify_pin(const uint8_t *candidate) {
    return (candidate[0] == pin[0] &&
            candidate[1] == pin[1] &&
            candidate[2] == pin[2] &&
            candidate[3] == pin[3]);
}

/* ---- Command Handlers ---- */

/**
 * Handle UNLOCK ('U') or LOCK ('L') command.
 * Format: [PIN_0][PIN_1][PIN_2][PIN_3][U or L]
 * Total: 5 bytes already in buf.
 */
void handle_lock_unlock(const uint8_t *buf) {
    if (!verify_pin(buf)) {
        uart1_print("ERR\n");
        return;
    }

    uint8_t cmd = buf[4];
    if (cmd == 'U' || cmd == 'u') {
        relay_on();
        uart1_print("OK\n");
    }
    else if (cmd == 'L' || cmd == 'l') {
        relay_off();
        uart1_print("OK\n");
    }
    else {
        uart1_print("ERR\n");
    }
}

/**
 * Handle CHANGE PIN ('C') command.
 * At this point we have the first 5 bytes: [oldPIN][C]
 * We need to read 4 more bytes for the new PIN.
 * Format: [oldPIN_0..3]C[newPIN_0..3]  → 9 bytes total
 */
void handle_change_pin(const uint8_t *buf) {
    /* buf[0..3] = old PIN, buf[4] = 'C' */

    /* Verify old PIN first */
    if (!verify_pin(buf)) {
        /* Still need to consume the 4 new PIN bytes to keep sync */
        uart1_read(); uart1_read(); uart1_read(); uart1_read();
        uart1_print("ERR\n");
        return;
    }

    /* Read the 4 bytes of the new PIN */
    uint8_t new_pin[4];
    new_pin[0] = uart1_read();
    new_pin[1] = uart1_read();
    new_pin[2] = uart1_read();
    new_pin[3] = uart1_read();

    /* Validate new PIN (must be ASCII digits '0'-'9') */
    for (uint8_t i = 0; i < 4; i++) {
        if (new_pin[i] < '0' || new_pin[i] > '9') {
            uart1_print("ERR\n");
            return;
        }
    }

    /* Update PIN in RAM */
    pin[0] = new_pin[0];
    pin[1] = new_pin[1];
    pin[2] = new_pin[2];
    pin[3] = new_pin[3];

    uart1_print("OK\n");
}

/* ---- Main Loop ---- */
void main(void) {
    uint8_t buf[5];  /* Holds [PIN_0..3][CMD] */
    uint8_t idx = 0;

    clock_init();
    gpio_init();
    uart1_init();
    relay_off();  /* Start in locked state */

    uart1_print("RDY\n");

    for (;;) {
        buf[idx] = uart1_read();
        idx++;

        if (idx >= 5) {
            /* We have 5 bytes: [PIN][CMD] */
            uint8_t cmd = buf[4];

            if (cmd == 'C' || cmd == 'c') {
                /* PIN Change — need 4 more bytes */
                handle_change_pin(buf);
            }
            else {
                /* Lock or Unlock */
                handle_lock_unlock(buf);
            }

            idx = 0;  /* Reset for next command */
        }
    }
}
